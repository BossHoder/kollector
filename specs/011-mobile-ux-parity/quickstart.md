# Quickstart: Mobile UX Parity (Web -> Mobile)

**Feature**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)
**Date**: 2026-03-10

## Prerequisites

- Node.js LTS (v20+ recommended)
- MongoDB + Redis running for backend
- Expo tooling (`npx expo`)
- Android emulator and/or physical device
- Optional: iOS simulator (macOS)

Target support:
- iOS 15+
- Android 10+ (API 29+)

## Setup and Run

### 1) Backend

```bash
cd server
npm install
npm run dev
```

### 2) Web

```bash
cd web
npm install
npm run dev
```

### 3) Mobile

```bash
cd mobile
npm install
npx expo start
```

## Required environment

`mobile/.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
EXPO_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Focused verification for reported issues

### A) Mobile upload does not register image

1. Open Upload screen.
2. Choose image from camera and gallery (both paths).
3. If camera fails, verify app keeps context and creates local placeholder item with retry.
4. Retry upload from placeholder.

Expected:
- No silent drop of selected image.
- User always sees an entry representing upload intent.

### B) File details missing in Asset Detail

1. Upload a new asset.
2. Open detail immediately while status is `processing`.

Expected:
- Filename, size, MIME/format, and upload time are visible from upload metadata.

### C) Category filter 400 mismatch

1. Apply each category filter in web and mobile.
2. Confirm request query category is canonical.
3. Force unknown category in client state.

Expected:
- Client normalizes alias values.
- Unknown values fall back to `All` and omit category query.
- No repeated 400 loop.

### D) Realtime temporarily unavailable

1. Start with healthy socket, observe realtime update.
2. Simulate socket outage.
3. Keep user on library/detail for >=30s.

Expected:
- Reconnecting banner appears.
- Polling fallback activates (10-15s cadence).
- Data freshness remains <=15s.
- Polling stops once socket reconnects.

### E) Mobile filter parity with web (status + category)

1. On mobile library, use status filter only.
2. Enable category filter control and combine with status.

Expected:
- Mobile supports category + status combinations like web.
- Active filter indicators are visible and reset correctly.

## Regression checks

- Image toggle must not render empty image URL (`src=""` equivalent).
- Retry action on failed/partial asset sets state back to `processing`.
- Archive action updates list/detail consistently.
- Auth refresh still works for concurrent 401 responses.

## Test commands

```bash
cd mobile
npm test

cd ../web
npm test

cd ../server
npm test
```

## Regression evidence (2026-03-10)

### Mobile parity regression

Command:

```bash
cd mobile
npm test -- src/screens/upload/UploadScreen.retry.test.js src/screens/assets/AssetDetailScreen.states.test.js src/screens/assets/AssetsLibraryScreen.realtime.test.js src/utils/categoryNormalizer.test.js src/hooks/useRealtimeFallback.test.js
```

Result:
- PASS: 5/5 suites
- PASS: 12/12 tests

### Web parity regression

Command:

```bash
cd web
npm test -- --run tests/integration/assets-filter.integration.test.ts tests/unit/components/ImageToggle.test.tsx tests/integration/asset-detail.test.tsx tests/integration/socket-updates.test.tsx
```

Result:
- PASS: 4/4 files
- PASS: 24/24 tests

### Server parity regression

Command:

```bash
cd server
npm test -- tests/contract/assets/get.test.js tests/contract/assets/contracts-alignment.test.js
```

Result:
- PASS: 2/2 suites
- PASS: 9/9 tests

Notes:
- Attempted broader contract run with `assets-status-filter.test.js` and `retry.test.js`.
- `assets-status-filter.test.js` currently fails on legacy `id` expectation for failed status case (received undefined).
- `retry.test.js` currently fails due missing helper import path `../../helpers/db` in existing test harness.
