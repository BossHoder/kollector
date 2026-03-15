#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="${APP_ROOT:-/opt/kollector}"

sudo apt-get update
sudo apt-get install -y ca-certificates curl git gnupg lsb-release nginx

if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

sudo mkdir -p "${APP_ROOT}/releases" "${APP_ROOT}/shared" "${APP_ROOT}/backups"
sudo chown -R "${USER}:${USER}" "${APP_ROOT}"
sudo usermod -aG docker "${USER}" || true

if [ ! -f "${APP_ROOT}/shared/.env.production" ]; then
  cp deploy/oracle/.env.production.example "${APP_ROOT}/shared/.env.production"
fi

echo "Host bootstrap complete."
echo "Populate ${APP_ROOT}/shared/.env.production before the first deploy."
