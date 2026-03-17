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

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${RELEASE_DIR}/docker-compose.prod.yml" \
  ps

curl -fsS "http://127.0.0.1:${EDGE_HTTP_PORT}/health" >/dev/null
curl -fsS "http://127.0.0.1:${EDGE_HTTP_PORT}/ai/health" >/dev/null

echo "Health checks passed on port ${EDGE_HTTP_PORT}."
