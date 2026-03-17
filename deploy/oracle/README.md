# Oracle Ubuntu VM deployment

This directory contains the production packaging for the `kollector` stack:

- `docker-compose.prod.yml` for `web`, `server`, `ai-worker`, `redis`, and edge `nginx`
- host bootstrap and deployment scripts under `deploy/oracle/scripts`
- host Nginx templates for the cutover from an older project to this stack

## First-time VM setup

1. Copy the repository to the VM once, or clone it temporarily.
2. Run `bash deploy/oracle/scripts/install-host.sh`.
3. Edit `/opt/kollector/shared/.env.production` from `deploy/oracle/.env.production.example`.
4. Verify MongoDB Atlas IP allowlist and Oracle security rules allow inbound HTTP and HTTPS.

## Domain and HTTPS

For a public deployment such as `thekollector.tech`, update `/opt/kollector/shared/.env.production` with:

```env
PUBLIC_BASE_URL=https://thekollector.tech
CLIENT_URL=https://thekollector.tech
CORS_ORIGIN=https://thekollector.tech,https://www.thekollector.tech
SOCKET_CORS_ORIGIN=https://thekollector.tech,https://www.thekollector.tech
STORAGE_PUBLIC_BASE_URL=https://thekollector.tech
HOST_NGINX_SERVER_NAME=thekollector.tech www.thekollector.tech
HOST_NGINX_TLS_CERT_PATH=/etc/letsencrypt/live/thekollector.tech/fullchain.pem
HOST_NGINX_TLS_KEY_PATH=/etc/letsencrypt/live/thekollector.tech/privkey.pem
```

Obtain the certificate on the VM before the first HTTPS deploy:

```bash
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot certonly --nginx -d thekollector.tech -d www.thekollector.tech
```

Using `certonly --nginx` keeps the certificate issuance step separate from the repository-managed Nginx template so future deploys continue to preserve HTTPS.

## Manual deploy on the VM

```bash
APP_ROOT=/opt/kollector
RELEASE_DIR="${APP_ROOT}/releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "${RELEASE_DIR}"
tar -xzf kollector-release.tgz -C "${RELEASE_DIR}"
bash "${RELEASE_DIR}/deploy/oracle/scripts/deploy_release.sh" "${RELEASE_DIR}"
```

## GitHub Actions secrets

The workflow expects these secrets:

- `PROD_SSH_HOST`
- `PROD_SSH_USER`
- `PROD_SSH_KEY`

Optional variables:

- `PROD_APP_ROOT` default `/opt/kollector`

## Notes

- The edge Compose Nginx listens on `127.0.0.1:${EDGE_HTTP_PORT}` and host Nginx publishes port `80`, plus `443` when TLS certificate paths are configured.
- Set `HOST_NGINX_SERVER_NAME` to your production domains, for example `thekollector.tech www.thekollector.tech`.
- If you obtain a Let's Encrypt certificate with `certbot certonly --nginx`, set `HOST_NGINX_TLS_CERT_PATH` and `HOST_NGINX_TLS_KEY_PATH` so every deploy preserves HTTPS.
- The stack uses local disk storage shared between `server`, `ai-worker`, and edge `nginx`.
- `ai-worker` remains on Python `3.11` inside Docker; the host can still have Python `3.14.2` installed.
