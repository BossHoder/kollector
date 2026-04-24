# Implementation Plan: Mobile UX Parity (Web -> Mobile)

**Branch**: `011-mobile-ux-parity` | **Date**: 2026-03-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-mobile-ux-parity/spec.md`

## Summary

Deliver mobile parity for core MVP flows (library, upload, detail, realtime, settings) with contract-first alignment to backend and targeted fixes for current regressions: invalid category filters causing 400, camera upload failure handling, missing file metadata on detail, realtime unavailability, and mobile category filtering parity with web.

Implementation strategy:
- Standardize category handling via canonical server categories (`sneaker|lego|camera|other`) plus alias normalization at client boundary.
- Preserve user intent on upload failures via local placeholder assets and retry path.
- Make realtime resilient with Socket.io primary channel + 10-15s polling fallback while disconnected.
- Ensure detail file info is available immediately from upload metadata while processing.
- Keep web and mobile filter behavior semantically consistent without inventing backend contracts.

## Technical Context

**Language/Version**:
- Mobile: JavaScript (React Native + Expo)
- Web: TypeScript + React (Vite)
- Server: Node.js (Express + Mongoose)

**Primary Dependencies**:
- Mobile: `expo-image-picker`, `socket.io-client`, React Navigation
- Server: `express-validator`, Socket.io, BullMQ, Mongoose
- Web: React Query, React Router

**Storage**:
- Server persistent storage: MongoDB (`Asset`, `User`, related models)
- Queue/async boundary: Redis (BullMQ)
- Client-side ephemeral state: in-memory React state for placeholder assets

**Testing**:
- Mobile unit/component tests (Jest) for API wrappers, asset mapping, socket handling, upload flow
- Server contract/integration tests for assets list filter validation and retry/upload contracts
- Web regression tests for filter normalization and image toggle empty-src handling

**Target Platform**:
- iOS 15+
- Android 10+ (API 29+)
- Web modern browsers (existing Vite target)

**Project Type**: Multi-app monorepo (server + web + mobile)

**Performance Goals**:
- Mobile library scroll remains smooth (target 60fps on representative devices)
- Realtime updates appear <=3s when socket connected
- Fallback freshness <=15s during socket outage

**Constraints**:
- Contract-first with existing backend endpoints/events
- No synchronous AI/image heavy work in request handlers (queue boundary preserved)
- Upload file max 10 MB
- No schema hallucination beyond defined Asset fields

**Scale/Scope**:
- MVP parity across 5 core user stories
- Single feature branch touching mobile, web, and server interfaces

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate Review

1. Modular Monolith Discipline: PASS
- Changes remain within existing server modules (`assets`, auth, socket integration), no microservice sprawl.

2. Async Queue Boundaries: PASS
- Upload/retry continue to use analyze queue; no synchronous AI inference introduced.

3. Test-First: PASS (planned)
- Explicit tests planned first for category normalization, upload failure placeholder behavior, metadata hydration, socket fallback/polling behavior.

4. Data Schema Fidelity: PASS
- Canonical categories and statuses align with `Asset` schema.
- File metadata fields surfaced from existing/contracted response fields; no undocumented persistence shape required.

5. Observability, Versioning, Simplicity: PASS
- Realtime fallback and category normalization are additive; no breaking endpoint replacement.

6. FE UI Fidelity (Stitch): PASS
- Scope is behavior parity/fixes, not redesign.

7. Contract-First FE Integration: PASS with amendments documented
- Contract updates captured under `specs/011-mobile-ux-parity/contracts/`.

### Post-Design Gate Review

1. Tests defined before implementation: PASS
2. Queue/event contracts explicit: PASS
3. Schema and enum fidelity maintained: PASS
4. FE contract alignment preserved (with explicit amendments): PASS
5. Any violations requiring complexity exception: NONE

## Project Structure

### Documentation (this feature)

```text
specs/011-mobile-ux-parity/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- assets.mobile-parity.openapi.json
|   |-- category-aliases.schema.json
|   |-- assets.retry.openapi.json
|   `-- assets.status-filter.openapi.patch.json
`-- tasks.md
```

### Source Code (repository root)

```text
server/
|-- src/
|   |-- models/
|   |-- modules/
|   |-- middleware/
|   `-- config/
`-- tests/
    |-- contract/
    |-- integration/
    `-- unit/

web/
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- pages/
|   `-- types/
`-- tests/

mobile/
|-- src/
|   |-- api/
|   |-- screens/
|   |-- hooks/
|   |-- contexts/
|   `-- services/
`-- __mocks__/
```

**Structure Decision**:
Use existing monorepo layout and implement behavior parity through coordinated changes across `mobile/src`, `web/src`, and server `assets` module contracts. No new top-level projects are needed.

## Complexity Tracking

No constitution violations requiring justification.
