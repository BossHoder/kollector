#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_DIR="$(cd "${1:?release dir is required}" && pwd)"
APP_ROOT="${APP_ROOT:-/opt/kollector}"
ENV_FILE="${ENV_FILE:-${APP_ROOT}/shared/.env.production}"
CURRENT_LINK="${APP_ROOT}/current"
PREVIOUS_RELEASE=""

read_env_value() {
  local key="$1"
  awk -v key="${key}" 'index($0, key "=") == 1 { print substr($0, length(key) + 2) }' "${ENV_FILE}" | tail -n 1
}

if [ ! -f "${ENV_FILE}" ]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

if [ -L "${CURRENT_LINK}" ]; then
  PREVIOUS_RELEASE="$(readlink -f "${CURRENT_LINK}")"
fi

rollback() {
  if [ -n "${PREVIOUS_RELEASE}" ] && [ -d "${PREVIOUS_RELEASE}" ]; then
    echo "Deployment failed. Rolling back to ${PREVIOUS_RELEASE}."
    ln -sfn "${PREVIOUS_RELEASE}" "${CURRENT_LINK}"
    docker compose \
      --env-file "${ENV_FILE}" \
      -f "${PREVIOUS_RELEASE}/docker-compose.prod.yml" \
      up -d --build --remove-orphans || true
  fi
}

trap rollback ERR

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${CURRENT_LINK}/docker-compose.prod.yml" \
  up -d --build --remove-orphans

WARM_MODELS_REQUIRED="${WARM_MODELS_REQUIRED:-$(read_env_value WARM_MODELS_REQUIRED)}"
WARM_MODELS_REQUIRED="${WARM_MODELS_REQUIRED:-false}"

if ! bash "${CURRENT_LINK}/deploy/oracle/scripts/warm_models.sh" "${CURRENT_LINK}" "${ENV_FILE}"; then
  echo "AI model warmup failed."
  if [ "${WARM_MODELS_REQUIRED}" = "true" ]; then
    echo "WARM_MODELS_REQUIRED=true, aborting deployment." >&2
    exit 1
  fi
  echo "Continuing deployment without preloaded AI models."
fi

bash "${CURRENT_LINK}/deploy/oracle/scripts/health_check.sh" "${CURRENT_LINK}" "${ENV_FILE}"

ENABLE_HOST_NGINX_CUTOVER="${ENABLE_HOST_NGINX_CUTOVER:-$(read_env_value ENABLE_HOST_NGINX_CUTOVER)}"
ENABLE_HOST_NGINX_CUTOVER="${ENABLE_HOST_NGINX_CUTOVER:-true}"

if [ "${ENABLE_HOST_NGINX_CUTOVER}" = "true" ]; then
  bash "${CURRENT_LINK}/deploy/oracle/scripts/install_host_nginx.sh" "${CURRENT_LINK}" "${ENV_FILE}"
fi

docker image prune -f >/dev/null 2>&1 || true

trap - ERR
echo "Deployment succeeded for release ${RELEASE_DIR}."
