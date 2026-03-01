# Research: Mobile UX Parity (Web → Mobile)

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-02-10

## Decisions

### 1) Mobile OS Support

- **Decision**: Support iOS 15+ and Android 10+ (API 29+).
- **Rationale**: Enables modern permission and navigation behaviors while keeping broad device coverage.
- **Alternatives considered**:
  - iOS 14 / Android 9: increases compatibility but adds platform edge-case cost.
  - iOS 16 / Android 12: reduces test matrix but narrows users.

### 2) Categories for MVP

- **Decision**: Mobile uses backend-enforced categories only: `sneaker | lego | camera | other`.
- **Rationale**: Constitution requires contract-first integration; backend route validation currently enforces these enums.
- **Alternatives considered**:
  - Expand categories server-side to match broader web taxonomy: higher impact, requires contract changes and migration.
  - Show web categories but map most to `other`: creates semantic mismatch and weakens analytics.

### 3) Upload File Size Limit

- **Decision**: Maximum 10 MB per image upload.
- **Rationale**: Improves reliability on mobile networks; reduces timeouts and memory pressure.
- **Alternatives considered**:
  - 20 MB: more permissive for high-res photos, but higher failure risk.
  - 50 MB: likely to cause poor UX on slower networks.

### 4) Mobile Auth Refresh Strategy

- **Decision**: Mobile sends `X-Client-Platform: mobile` and uses `/api/auth/refresh` with `refreshToken` in JSON body; server returns `{ accessToken }`.
- **Rationale**: Matches server behavior in [server/src/modules/auth/auth.controller.js](../../server/src/modules/auth/auth.controller.js).
- **Alternatives considered**:
  - Web-style httpOnly cookie refresh: not suitable for native clients.
  - Expect refresh endpoint to return a new refresh token: server currently does not.

### 5) Realtime Strategy

- **Decision**: Use Socket.io with JWT auth in `socket.handshake.auth.token` and listen for `asset_processed` events.
- **Rationale**: Matches server socket auth in [server/src/config/socket.js](../../server/src/config/socket.js) and event emission in [server/src/modules/assets/assets.events.js](../../server/src/modules/assets/assets.events.js).
- **Alternatives considered**:
  - Polling: higher latency + worse UX; contradicts realtime goal.
  - Push notifications: explicitly out of scope.

### 6) Required Backend Contract Amendments

- **Decision**: Add a dedicated retry endpoint and align status filter validation with the Asset model.
- **Rationale**: The mobile spec requires Retry for Failed, and the Asset schema supports `failed` and `partial` statuses, but current route validation does not.
- **Alternatives considered**:
  - Retry by re-submitting a new analyze-queue asset: breaks “same asset” semantics.
  - Keep validation restricted and hide statuses: violates parity and prevents filtering by `failed/partial`.

## Discovered Gaps (to be handled in Phase 2 tasks)

- **Assets list API pagination**: backend is cursor-based; mobile implementation must not assume page-number pagination.
- **Status naming**: backend uses `active` but UI label is "Ready"; mapping must be centralized and tested.
- **Web refresh-token assumptions**: web client currently assumes `refreshToken` returned from `/api/auth/refresh`; mobile must follow server’s actual response.
