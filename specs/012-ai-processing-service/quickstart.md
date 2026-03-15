# Quickstart: AI Processing Service (Local)

**Feature**: `012-ai-processing-service`  
**Date**: 2026-03-15

This quickstart is focused on running the AI service locally so the existing Node queue worker can complete jobs end-to-end.

## Prerequisites

- Running MongoDB (local or Atlas) configured in `server/.env`
- Running Redis configured in `server/.env` (`REDIS_URL`)
- Cloudinary credentials available (the AI service now fails fast if upload credentials are missing)
- Python `3.11` or `3.12` for `ai-worker/` (`3.13+` is not compatible with the pinned local ML stack)

## Configuration

### Node server env

In `server/.env` (or equivalent):

- `AI_SERVICE_URL=http://localhost:8000`
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`

### AI service env

In `ai-worker/.env` (or via environment variables):

- `PORT=8000`
- `ENVIRONMENT=development`
- Cloudinary credentials (same values as server)
- Model cache directory (optional): `U2NET_HOME=./.u2net`

Model defaults (MVP intent):
- Background removal: `briaai/RMBG-1.4`
- Metadata extraction: `vikhyatk/moondream2`

## Run (development)

### 1) Start Node server

From `server/`:

- `npm install`
- `npm run dev`

### 2) Start the BullMQ worker

The BullMQ worker is started automatically as part of Node server startup (see `server/src/app.js`). If the server starts successfully, the worker should also be running.

### 3) Start the Python AI service

From `ai-worker/`:

- Create and activate a Python `3.11` or `3.12` virtualenv
- Install dependencies from `ai-worker/requirements.txt`
- Start the HTTP server on port `8000`

Example commands:

- Windows PowerShell:
  - `py -3.11 -m venv .venv`
  - `.venv\Scripts\Activate.ps1`
  - `python -m pip install --upgrade pip`
  - `python -m pip install -r requirements.txt`
  - `python -m uvicorn main:app --host 0.0.0.0 --port 8000`
- macOS/Linux:
  - `python3.11 -m venv .venv`
  - `source .venv/bin/activate`
  - `python -m pip install --upgrade pip`
  - `python -m pip install -r requirements.txt`
  - `python -m uvicorn main:app --host 0.0.0.0 --port 8000`

Notes:

- The first `/analyze` request may spend noticeable time downloading local Hugging Face model weights.
- Background removal is required for success.
- If metadata extraction fails or returns low-confidence guesses, the service returns a processed image with null metadata so the asset can complete as `partial` instead of `failed`.
- For a quick manual check, run `python smoke_test.py` for `/health` only, or `python smoke_test.py --image-url <public-image-url> --category sneaker` to hit `/analyze`.

Validate that the service is alive:

- `GET http://localhost:8000/health` returns `200` with `{ "status": "ok" }`

## Verify end-to-end

1. Upload an image via the existing API endpoint `POST /api/assets/analyze-queue`.
2. Confirm the created asset transitions to `processing`.
3. Watch logs:
   - Node worker logs a call to `POST {AI_SERVICE_URL}/analyze`
   - AI service logs download -> background removal -> upload -> response
4. Confirm the asset transitions to:
   - `active` if at least one of `brand/model/colorway` is present, or
   - `partial` if all are unknown or empty.
5. Confirm `Asset.images.processed.url` is set to the returned processed image URL.

## Troubleshooting

- If Node logs `AI_SERVICE_URL environment variable is required`, set `AI_SERVICE_URL` in `server/.env`.
- If jobs retry repeatedly, check AI service logs for 5xx errors and confirm Cloudinary credentials, Python version, and first-run model download status.
- If jobs fail immediately, confirm the AI service returns 4xx only for invalid or unprocessable inputs.
- If the AI worker reports `Python 3.11 or 3.12 is required`, recreate the virtualenv with `py -3.11` or `python3.11` and reinstall dependencies.

## Event Contract Migration Note

- `asset_processed` success events now allow `status=partial` in addition to legacy `status=active`.
- During rollout, consumers must accept both values as successful processing outcomes.
- `status=failed` remains unchanged and indicates terminal failure.
