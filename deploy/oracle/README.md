# Oracle Ubuntu VM deployment

This directory contains the production packaging for the `kollector` stack:

- `docker-compose.prod.yml` for `web`, `server`, `ai-worker`, `redis`, and edge `nginx`
- host bootstrap and deployment scripts under `deploy/oracle/scripts`
- host Nginx templates for the cutover from an older project to this stack

## First-time VM setup

1. Copy the repository to the VM once, or clone it temporarily.
2. Run `bash deploy/oracle/scripts/install-host.sh`.
3. Edit `/opt/kollector/shared/.env.production` from `deploy/oracle/.env.production.example`.
4. Verify MongoDB Atlas IP allowlist and Oracle security rules allow inbound HTTP.

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

- The edge Compose Nginx listens on `127.0.0.1:${EDGE_HTTP_PORT}` and host Nginx publishes port `80`.
- The stack uses local disk storage shared between `server`, `ai-worker`, and edge `nginx`.
- `ai-worker` remains on Python `3.11` inside Docker; the host can still have Python `3.14.2` installed.
