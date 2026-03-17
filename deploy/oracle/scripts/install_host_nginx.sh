#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_DIR="${1:?release dir is required}"
ENV_FILE="${2:?env file is required}"
TARGET_SITE="${HOST_NGINX_SITE_PATH:-/etc/nginx/sites-available/kollector}"
ENABLED_SITE="${HOST_NGINX_ENABLED_PATH:-/etc/nginx/sites-enabled/kollector}"
BACKUP_DIR="${BACKUP_DIR:-/opt/kollector/backups}"
TEMPLATE_PATH="${RELEASE_DIR}/deploy/oracle/nginx/host-site.template.conf"

read_env_value() {
  local key="$1"
  awk -v key="${key}" 'index($0, key "=") == 1 { print substr($0, length(key) + 2) }' "${ENV_FILE}" | tail -n 1
}

EDGE_HTTP_PORT="${EDGE_HTTP_PORT:-$(read_env_value EDGE_HTTP_PORT)}"
EDGE_HTTP_PORT="${EDGE_HTTP_PORT:-8080}"

mkdir -p "${BACKUP_DIR}"
TMP_RENDERED="$(mktemp)"
sed "s/__EDGE_HTTP_PORT__/${EDGE_HTTP_PORT}/g" "${TEMPLATE_PATH}" > "${TMP_RENDERED}"

BACKUP_PATH=""
if sudo test -f "${TARGET_SITE}"; then
  BACKUP_PATH="${BACKUP_DIR}/$(basename "${TARGET_SITE}").$(date +%Y%m%d%H%M%S).bak"
  sudo cp "${TARGET_SITE}" "${BACKUP_PATH}"
fi

restore_backup() {
  if [ -n "${BACKUP_PATH}" ] && [ -f "${BACKUP_PATH}" ]; then
    sudo cp "${BACKUP_PATH}" "${TARGET_SITE}"
    sudo nginx -t && sudo systemctl reload nginx || true
  fi
}

trap 'restore_backup; rm -f "${TMP_RENDERED}"' ERR

sudo cp "${TMP_RENDERED}" "${TARGET_SITE}"
sudo ln -sfn "${TARGET_SITE}" "${ENABLED_SITE}"
if sudo test -L /etc/nginx/sites-enabled/default; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
sudo nginx -t
sudo systemctl reload nginx

rm -f "${TMP_RENDERED}"
trap - ERR

echo "Host Nginx now proxies public traffic to 127.0.0.1:${EDGE_HTTP_PORT}."
