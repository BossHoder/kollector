#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_DIR="${1:?release dir is required}"
ENV_FILE="${2:?env file is required}"

read_env_value() {
  local key="$1"
  awk -v key="${key}" 'index($0, key "=") == 1 { print substr($0, length(key) + 2) }' "${ENV_FILE}" | tail -n 1
}

EDGE_HTTP_PORT="${EDGE_HTTP_PORT:-$(read_env_value EDGE_HTTP_PORT)}"
EDGE_HTTP_PORT="${EDGE_HTTP_PORT:-8080}"

wait_for_url() {
  local url="$1"
  local attempts="${2:-15}"
  local delay_seconds="${3:-2}"
  local attempt=1

  while [ "${attempt}" -le "${attempts}" ]; do
    if curl -fsS "${url}" >/dev/null; then
      return 0
    fi

    if [ "${attempt}" -eq "${attempts}" ]; then
      echo "Health check failed for ${url} after ${attempts} attempts." >&2
      return 1
    fi

    sleep "${delay_seconds}"
    attempt=$((attempt + 1))
  done
}

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${RELEASE_DIR}/docker-compose.prod.yml" \
  ps

wait_for_url "http://127.0.0.1:${EDGE_HTTP_PORT}/health"
wait_for_url "http://127.0.0.1:${EDGE_HTTP_PORT}/ai/health"

echo "Health checks passed on port ${EDGE_HTTP_PORT}."
