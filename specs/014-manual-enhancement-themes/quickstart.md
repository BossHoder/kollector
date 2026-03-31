# Quickstart: Manual Image Enhancement and Theme Presets

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-03-24

## Prerequisites

- Node.js LTS (v20+ recommended)
- Python environment for `ai-worker`
- MongoDB + Redis running
- Cloudinary credentials configured for server/worker
- Mobile app (Expo) or API client for endpoint checks

## Start Services

### 1) Backend API

```bash
cd server
npm install
npm run dev
```

### 2) AI/Enhancement Worker

```bash
cd ai-worker
pip install -r requirements.txt
python main.py
```

### 3) Mobile App (API-first consumer)

```bash
cd mobile
npm install
npx expo start
```

## Contract Verification Flow

### A) Trigger enhancement (queued)

1. Choose existing asset id with `images.original`.
2. Call `POST /api/assets/:id/enhance-image`.

Expected:
- HTTP 202 accepted.
- Response contains queue/job reference.
- Asset read shows enhancement status `queued|processing`.

### B) Duplicate trigger rejection

1. Trigger enhancement for an asset.
2. Trigger again while first job is active.

Expected:
- Second request returns HTTP 409 Conflict.
- No duplicate active enhancement job created.

### C) Retry and terminal failure behavior

1. Simulate transient worker/storage failure.
2. Observe retry attempts.

Expected:
- Up to 3 attempts with backoff.
- After final failure, status becomes `failed`.
- Existing display fallback remains valid (`processed|original`).

### C1) SC-002 load profile execution (required for latency evidence)

Run enhancement latency validation using this exact profile:
- 1 enhancement worker process.
- 5 concurrent trigger requests.
- 100 accepted enhancement jobs.
- Image mix: 40% small (0.3-1.0MP), 40% medium (1.0-3.0MP), 20% large (3.0-8.0MP).
- Retry policy enabled up to 3 attempts with backoff.
- Continuous 30-minute measurement window.

Expected:
- At least 90% of successful enhancement jobs complete within 60 seconds.

### D) Enhanced detail image priority

1. Complete enhancement successfully for one asset.
2. Open asset detail and asset list/card views.

Expected:
- Detail uses `images.enhanced` first.
- List/card continue using `images.thumbnail`.

### E) Theme default and override behavior

1. Set user default with `PATCH /api/auth/me` -> `settings.preferences.assetTheme.defaultThemeId`.
2. Set asset override with `PATCH /api/assets/:id` -> `presentation.themeOverrideId`.
3. Clear asset override with `PATCH /api/assets/:id` -> `presentation.themeOverrideId: null`.
4. Clear user default with `PATCH /api/auth/me` -> `settings.preferences.assetTheme.defaultThemeId: null`.
5. Test with unknown preset id.

Expected:
- Valid preset ids persist and apply with override precedence.
- Null clears are accepted and remove stored override/default respectively.
- When both override and default are missing or null, theme resolves to `vault-graphite`.
- Unknown preset ids are rejected with validation error and no persisted change.

### F) Event and status-source behavior

1. Complete enhancement job.
2. Observe socket events and asset reads.

Expected:
- Existing `asset_processed` behavior unchanged for AI pipeline.
- New `asset_image_enhanced` event emitted for manual enhancement.
- Asset read endpoints remain source of truth for enhancement status/outcome.

### G) FE auth token refresh behavior with optional assetTheme payload

1. Run mobile auth refresh flow where `GET /api/auth/me` includes `settings.preferences.assetTheme`.
2. Run mobile auth refresh flow where `GET /api/auth/me` omits `settings.preferences.assetTheme`.
3. Simulate refresh failure.

Expected:
- Refresh success path remains stable in both optional payload-shape variants.
- Refresh failure still routes to the existing logout/reauth behavior.

## Suggested Test Commands

```bash
cd server
npm test -- tests/contract/assets tests/contract/auth tests/integration

cd ../mobile
npm test

cd ../web
npm test
```

## Done Criteria for this feature

- New endpoint and payload contracts validated.
- Queue isolation and retry policy validated.
- Optional schema additions exposed without breaking old clients.
- Theme validation rules and precedence behavior validated.
- Socket notification and API truth-source behavior validated.
- Acceptance evidence artifacts are recorded under `specs/014-manual-enhancement-themes/evidence/` for SC-001, SC-002, SC-004, and SC-005.
