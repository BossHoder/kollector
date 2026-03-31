# Implementation Plan: Manual Image Enhancement and Theme Presets

**Branch**: `014-manual-enhancement-themes` | **Date**: 2026-03-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-manual-enhancement-themes/spec.md`

## Summary

Deliver API-first manual image enhancement and preset theme controls without breaking existing contracts.

Technical approach:
- Add per-asset asynchronous enhancement trigger on `POST /api/assets/:id/enhance-image` returning 202.
- Add enhancement pipeline queue isolation (`asset-enhancement`) and keep AI queue/event contracts intact.
- Extend existing mutation surfaces only: `PATCH /api/assets/:id` for `presentation.themeOverrideId`, `PATCH /api/auth/me` for `settings.preferences.assetTheme.defaultThemeId`.
- Support clear semantics on those existing mutation surfaces using null (`themeOverrideId: null`, `defaultThemeId: null`) while preserving backward compatibility.
- Apply deterministic theme resolution in v1: asset override, then user default, then fallback preset `vault-graphite`.
- Preserve image semantics (`images.thumbnail` for list/card) and add `images.enhanced` for detail-first rendering.
- Persist enhancement status in asset reads; keep `asset_image_enhanced` as additive socket signal.

## Technical Context

**Language/Version**: Node.js (server), Python 3.x (worker), TypeScript/JavaScript (web/mobile)  
**Primary Dependencies**: Express, Mongoose, express-validator, BullMQ, Redis, Cloudinary, Pillow, NumPy, Socket.io  

**Storage**:
- MongoDB for asset/user persisted fields
- Redis for queue/job state
- Cloudinary for image derivatives

**Testing**:
- Server unit + contract + integration tests (Jest)
- Queue payload and socket event schema validation tests
- Mobile/web API contract and rendering-priority integration tests

**Target Platform**:
- Backend Linux containers
- Mobile iOS 15+ and Android 10+
- Modern web browsers

**Project Type**: Monorepo (server + web + mobile + ai-worker)

**Performance Goals**:
- 95% of enhancement trigger requests acknowledged <=2s
- 90% of successful enhancement jobs completed <=60s under load profile: 1 enhancement worker, 5 concurrent trigger requests, 100 accepted jobs, image mix (40% small 0.3-1.0MP, 40% medium 1.0-3.0MP, 20% large 3.0-8.0MP), retries enabled up to 3 attempts, measured over a continuous 30-minute window
- Detail image selection resolves locally with deterministic priority order

**Constraints**:
- Backward compatibility for existing APIs/events is mandatory
- No synchronous heavy image processing in HTTP handlers
- Enhancement queue must be separate from `ai-processing`
- Use only classical image processing (non-AI super-resolution)
- Preserve `images.original` immutability and Cloudinary flow
- Public contract changes for this feature must remain additive and follow semantic versioning MINOR policy (1.1.0), with explicit migration/release notes

**Scale/Scope**:
- v1 scope: one new endpoint, additive schema fields, additive event, queue isolation, mobile/web consumption updates
- Multi-client rollout across backend + mobile first (web remains compatible)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate Review

1. Modular Monolith Discipline: PASS
- Work stays within existing `assets`, `auth`, worker/queue modules; no new service split.

2. Async Queue Boundaries: PASS
- Enhancement runs through BullMQ queue `asset-enhancement`; no synchronous processing in route handlers.

3. Test-First (NON-NEGOTIABLE): PASS (planned)
- Plan includes tests-first for foundational schema/queue/bootstrap instrumentation, endpoint contracts, queue payload schema, socket event schema, client render priority behavior, and FE auth token refresh behavior before auth payload mapping changes.

4. Data Schema Fidelity: PASS
- Additive optional fields only (`images.enhanced`, enhancement status metadata, `settings.preferences.assetTheme`), no undeclared persistence.

5. Observability, Versioning & Simplicity: PASS
- Additive API/event contracts; preserves `asset_processed`; introduces explicit new event `asset_image_enhanced`; contract registry metadata and migration notes are tracked as additive MINOR (1.1.0) updates.

6. FE UI Fidelity (Stitch Prototypes): PASS
- Feature targets behavior and settings controls without redesigning prototype UI language.

7. Contract-First FE Integration: PASS
- All client behavior tied to explicit OpenAPI/schema artifacts under this feature contracts directory.

### Post-Design Gate Review

1. Tests defined before implementation: PASS
2. Foundational Red-Green ordering defined before foundational implementation: PASS
3. FE auth token refresh test-first coverage for optional auth payload extension: PASS
4. Contract semver MINOR + migration note tasks defined: PASS
5. Queue boundaries and payload schemas explicit: PASS
6. Data schema additions are additive and optional: PASS
7. Existing API and event contracts preserved: PASS
8. FE contract-first alignment with backend artifacts: PASS

## Project Structure

### Documentation (this feature)

```text
specs/014-manual-enhancement-themes/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- assets-image-enhancement.openapi.json
|   |-- auth-asset-theme.openapi.json
|   |-- asset-enhancement-job.schema.json
|   `-- asset-image-enhanced-event.schema.json
`-- tasks.md
```

### Source Code (repository root)

```text
server/
|-- src/
|   |-- modules/
|   |-- models/
|   |-- workers/
|   |-- contracts/
|   `-- middleware/
`-- tests/
    |-- contract/
    |-- integration/
    `-- unit/

mobile/
|-- src/
|   |-- api/
|   |-- screens/
|   |-- hooks/
|   |-- contexts/
|   `-- services/
`-- __mocks__/

web/
|-- src/
|   |-- components/
|   |-- pages/
|   |-- hooks/
|   `-- types/
`-- tests/

ai-worker/
|-- main.py
`-- tests/
```

**Structure Decision**:
Use the existing monorepo layout and implement additive backend contracts first, then mobile/web consumption updates. No new top-level project is introduced.

## Complexity Tracking

No constitution violations requiring justification.

