#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_DIR="${1:?release dir is required}"
ENV_FILE="${2:?env file is required}"

docker compose \
  --env-file "${ENV_FILE}" \
  -f "${RELEASE_DIR}/docker-compose.prod.yml" \
  exec -T ai-worker \
  python warm_models.py
