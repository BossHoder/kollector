# Tasks: Manual Image Enhancement and Theme Presets

**Input**: Design documents from `/specs/014-manual-enhancement-themes/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are required for this feature because the constitution mandates test-first execution.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish contract registration and shared constants used across stories.

- [X] T001 Register enhancement/auth OpenAPI contracts and additive MINOR version metadata (1.1.0) in server/src/contracts/openapi.js
- [X] T002 [P] Add enhancement queue/event constants in server/src/modules/assets/enhancement.constants.js
- [X] T003 [P] Add preset theme catalog seed for mobile consumption in mobile/src/config/assetThemePresets.js
- [X] T004 [P] Add preset theme catalog seed for web consumption in web/src/lib/assetThemePresets.ts
- [X] T005 Add test data builders for enhancement payloads in server/tests/unit/assets/enhancement-fixtures.js
- [X] T063 Add contract semver verification test for additive 1.1.0 fields and backward compatibility in server/tests/contract/contracts-semver-versioning.test.js

---

## Phase 2A: Foundational Tests First (Blocking Prerequisites)

**Purpose**: Create failing foundational tests before foundational implementation work.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T064 Add failing schema test for additive asset enhancement fields (including images.enhanced and immutable images.original) in server/tests/unit/models/asset.enhancement-schema.test.js
- [X] T065 [P] Add failing schema test for user assetTheme default field in server/tests/unit/models/user.asset-theme-schema.test.js
- [X] T066 [P] Add failing queue payload/module contract test for asset-enhancement jobs in server/tests/contract/assets/asset-enhancement-queue.contract.test.js
- [X] T073 [P] Add failing enhancement event payload/schema test for foundational emitter helpers in server/tests/unit/assets/asset-enhancement-events.schema.test.js
- [X] T067 [P] Add failing worker bootstrap/startup wiring test for asset-enhancement worker registration in server/tests/integration/workers/asset-enhancement-bootstrap.test.js
- [X] T068 [P] Add failing controller metrics/ack instrumentation test for enhance-image enqueue acknowledgements in server/tests/integration/assets/enhance-image-ack-metrics.test.js

**Checkpoint**: Foundational failing tests are present and confirmed failing.

---

## Phase 2B: Foundational Implementation (Blocking Prerequisites)

**Purpose**: Implement core schema and queue foundations required by all user stories after failing tests exist.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Extend asset image/enhancement persistence fields in server/src/models/Asset.js
- [X] T007 [P] Extend user preferences schema with assetTheme default in server/src/models/User.js
- [X] T008 Create theme preset validation helper in server/src/modules/assets/theme-presets.catalog.js
- [X] T009 Add dedicated enhancement queue module for asset-enhancement in server/src/modules/assets/assets.enhancement.queue.js
- [X] T010 [P] Add enhancement socket event emitter helpers in server/src/modules/assets/assets.enhancement.events.js
- [X] T011 Implement enhancement worker bootstrap in server/src/workers/asset-enhancement.worker.js
- [X] T012 [P] Extend ai-worker models and request parsing for enhancement in ai-worker/main.py
- [X] T013 Wire enhancement worker startup and graceful shutdown in server/src/app.js
- [X] T014 Add enhancement-aware queue metrics aggregation in server/src/modules/assets/assets.controller.js

**Checkpoint**: Foundation complete. User stories can now proceed.

---

## Phase 3: User Story 1 - Manually Enhance a Single Asset Image (Priority: P1) MVP

**Goal**: Users can trigger manual enhancement per asset and see enhanced detail imagery through async processing.

**Independent Test**: Trigger enhancement on one asset, observe HTTP 202 queue response, verify duplicate requests return 409 during active job, and confirm detail view prioritizes enhanced image when processing succeeds.

### Tests for User Story 1

- [X] T015 [P] [US1] Add contract test for POST /api/assets/:id/enhance-image in server/tests/contract/assets/enhance-image.test.js
- [ ] T016 [P] [US1] Add integration test for enhancement lifecycle and duplicate rejection in server/tests/integration/asset-enhancement-pipeline.test.js
- [ ] T017 [P] [US1] Add enhancement worker retry/failure unit tests in server/tests/unit/assets/enhancement-worker.test.js
- [ ] T018 [P] [US1] Add ai-worker endpoint tests for classical enhancement processing in ai-worker/tests/test_enhance_success.py
- [ ] T019 [P] [US1] Add mobile API/detail flow tests for enhancement CTA and fallback images in mobile/src/screens/assets/AssetDetailScreen.states.test.js
- [ ] T072 [P] [US1] Add integration test verifying enhancement never mutates images.original and stores derivative in images.enhanced in server/tests/integration/assets/enhancement-original-immutability.test.js

### Implementation for User Story 1

- [X] T020 [US1] Add enhance-image route and validators in server/src/modules/assets/assets.routes.js
- [X] T021 [US1] Implement queueEnhancement controller action in server/src/modules/assets/assets.controller.js
- [X] T022 [US1] Implement enhancement service methods and status transitions in server/src/modules/assets/assets.service.js
- [X] T023 [US1] Implement enhancement queue producer and retry policy in server/src/modules/assets/assets.enhancement.queue.js
- [X] T024 [US1] Implement enhancement worker job processing and persistence writes in server/src/workers/asset-enhancement.worker.js
- [X] T025 [US1] Implement classical enhancement endpoint in ai-worker/main.py
- [X] T026 [US1] Extend server AI client with enhancement API call in server/src/modules/assets/ai.client.js
- [X] T027 [US1] Emit asset_image_enhanced socket event payloads in server/src/modules/assets/assets.enhancement.events.js
- [X] T028 [US1] Create dedicated asset read serializer in server/src/modules/assets/asset.serializer.js and wire enhancement fields in server/src/modules/assets/assets.service.js
- [X] T029 [US1] Add triggerEnhancement API wrapper in mobile/src/api/assetsApi.js
- [X] T030 [US1] Add Enhance Image CTA and status rendering in mobile/src/screens/assets/AssetDetailScreen.js
- [X] T031 [US1] Add enhanced-first detail image mapping helper in mobile/src/utils/assetMapper.js

**Checkpoint**: User Story 1 independently functional and testable.

---

## Phase 4: User Story 2 - Apply Theme at Asset and Collection Levels (Priority: P2)

**Goal**: Users can set a global default asset theme and override a specific asset theme using existing PATCH surfaces.

**Independent Test**: Set default theme via auth profile update, set asset override via asset patch, verify override precedence, and verify unknown preset IDs are rejected without persistence.

### Tests for User Story 2

- [X] T032 [P] [US2] Add contract test for PATCH /api/auth/me assetTheme default including null-clear semantics for settings.preferences.assetTheme.defaultThemeId in server/tests/contract/auth/me-theme.test.js
- [X] T033 [P] [US2] Add contract test for PATCH /api/assets/:id presentation.themeOverrideId including null-clear semantics in server/tests/contract/assets/theme-override.test.js
- [X] T034 [P] [US2] Add unit tests for preset id validation rules in server/tests/unit/assets/theme-presets.catalog.test.js
- [ ] T035 [P] [US2] Add mobile settings/detail theme precedence tests in mobile/src/screens/settings/SettingsScreen.test.js
- [X] T057 [P] [US2] Add contract test for GET /api/auth/me optional settings.preferences.assetTheme response shape covering present, absent, and null-cleared cases in server/tests/contract/auth/me-get-theme-shape.test.js
- [ ] T069 [P] [US2] Add mobile auth token refresh behavior tests for optional settings.preferences.assetTheme response shape and refresh-failure logout/reauth path in mobile/src/contexts/AuthContext.token-refresh.test.js

### Implementation for User Story 2

- [X] T036 [US2] Extend existing GET/PATCH /api/auth/me validators in server/src/modules/auth/auth.routes.js
- [X] T037 [US2] Extend existing getMe/patchMe handlers in server/src/modules/auth/auth.controller.js
- [X] T038 [US2] Extend existing auth service user settings preference updates in server/src/modules/auth/auth.service.js
- [X] T039 [US2] Enable presentation.themeOverrideId writes in asset updates in server/src/modules/assets/assets.service.js
- [X] T040 [US2] Enforce preset validation on auth and asset writes in server/src/modules/assets/theme-presets.catalog.js
- [X] T041 [US2] Extend auth payload mapping with settings.preferences.assetTheme in mobile/src/contexts/AuthContext.js
- [X] T042 [US2] Add default theme selector controls in mobile/src/screens/settings/SettingsScreen.js
- [X] T043 [US2] Add per-asset theme override controls in mobile/src/screens/assets/AssetDetailScreen.js

**Checkpoint**: User Stories 1 and 2 both independently testable.

---

## Phase 5: User Story 3 - Preserve Existing API and Rendering Contracts (Priority: P3)

**Goal**: Additive compatibility is preserved for existing endpoints, events, and list/detail image semantics.

**Independent Test**: Run legacy contract tests and socket consumers to confirm existing payloads remain valid while new optional fields/events are additive.

### Tests for User Story 3

- [ ] T044 [P] [US3] Add additive-compatibility contract assertions for asset reads in server/tests/contract/assets/contracts-alignment.test.js
- [ ] T045 [P] [US3] Add socket compatibility tests for asset_processed + asset_image_enhanced in server/tests/unit/assets/socket-events.test.js
- [ ] T046 [P] [US3] Add web mapper tests for thumbnail list/card and enhanced detail priority in web/tests/integration/asset-detail.test.tsx
- [ ] T047 [P] [US3] Add mobile socket compatibility tests for additive enhancement event in mobile/src/contexts/SocketContext.test.js

### Implementation for User Story 3

- [ ] T048 [US3] Keep asset_processed behavior unchanged while adding new event path in server/src/modules/assets/assets.events.js
- [ ] T049 [US3] Add runtime compatibility assertion wiring for additive contracts and unchanged legacy payload expectations in server/tests/contract/assets/contracts-alignment.test.js
- [X] T050 [US3] Handle asset_image_enhanced events without breaking existing listeners in mobile/src/contexts/SocketContext.js
- [X] T051 [US3] Add additive enhancement event handling in web socket client in web/src/lib/socket.ts
- [X] T052 [US3] Preserve thumbnail semantics with enhanced detail fallback in web asset mapper in web/src/lib/assetMapper.ts

**Checkpoint**: All user stories complete with backward compatibility preserved.

---

## Phase 6: Polish & Cross-Cutting

**Purpose**: Final hardening, docs, and verification across stories.

- [ ] T053 [P] Add enhancement queue observability logs and counters in server/src/modules/assets/assets.enhancement.queue.js
- [ ] T054 [P] Update mobile API usage notes for enhancement and theme preferences in mobile/README.md
- [ ] T055 [P] Update web API usage notes for enhanced image fallback semantics in web/README.md
- [ ] T056 Validate full quickstart flow and record evidence in specs/014-manual-enhancement-themes/quickstart.md
- [ ] T058 Capture SC-001 evidence by measuring API queue-ack latency p95 from POST /api/assets/:id/enhance-image over >=200 valid requests and store report in specs/014-manual-enhancement-themes/evidence/sc-001-queue-ack.md
- [ ] T059 Capture SC-002 evidence using load profile: 1 enhancement worker, 5 concurrent trigger requests, 100 accepted jobs, image mix (40% small 0.3-1.0MP, 40% medium 1.0-3.0MP, 20% large 3.0-8.0MP), retries enabled up to 3 attempts, measured over a continuous 30-minute window; document successful completion <=60s ratio in specs/014-manual-enhancement-themes/evidence/sc-002-enhancement-latency.md
- [ ] T060 Capture SC-004 UAT evidence with >=30 user attempts for default theme + per-asset override first-try completion and store results in specs/014-manual-enhancement-themes/evidence/sc-004-uat-theme-success.md
- [ ] T061 Capture SC-005 evidence by validating detail primary image selection over >=200 detail renders where enhanced exists and recording >=99% pass rate in specs/014-manual-enhancement-themes/evidence/sc-005-detail-image-selection.md
- [ ] T062 [P] Add evidence index summarizing SC-001/SC-002/SC-004/SC-005 measurement assumptions, scripts, and outputs in specs/014-manual-enhancement-themes/evidence/README.md
- [X] T070 Add migration note for additive contract release 1.1.0 (new optional fields/events, compatibility expectations, no breaking changes) in specs/014-manual-enhancement-themes/contracts/migration-notes-1.1.0.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no prerequisites.
- Foundational Tests First (Phase 2A) depends on Setup and must complete in a failing state before implementation.
- Foundational Implementation (Phase 2B) depends on Phase 2A and blocks all story work.
- User stories depend on Foundational completion.
- Polish depends on completion of selected user stories.

### Foundational Red-Green-Refactor Dependencies

- Red: T064 must fail before T006.
- Red: T065 must fail before T007.
- Red: T066 must fail before T009.
- Red: T073 must fail before T010.
- Red: T067 must fail before T011 and T013.
- Red: T068 must fail before T014 and before T021 instrumentation is finalized.
- Green/Refactor: Foundational implementation tasks are complete only after corresponding tests pass and refactor preserves passing status.

### Cross-Story Test-First Dependencies

- T069 must fail before T041 to preserve auth token refresh behavior while extending optional auth payload mapping.
- T072 must fail before T024/T028 to prove images.original immutability and separate images.enhanced persistence.

### User Story Dependencies

- US1 (P1) starts immediately after Foundational and defines MVP.
- US2 (P2) starts after Foundational and can run in parallel with late US1 work once shared files are coordinated.
- US3 (P3) depends on additive behavior from US1 and US2 for full compatibility verification.

### Within Each User Story

- Write tests first and confirm failing state.
- Implement route/controller/service/worker in dependency order.
- Complete story-level integration before moving to next priority checkpoint.

## Parallel Opportunities

- Setup: T002, T003, and T004 can run in parallel.
- Foundational tests-first: T065, T066, T073, T067, and T068 can run in parallel after T064 scaffolding alignment.
- Foundational implementation: T007, T010, and T012 can run in parallel after corresponding Phase 2A tests are failing.
- US1 tests T015-T019 can run in parallel.
- US2 tests T032-T035, T057, and T069 can run in parallel.
- US3 tests T044-T047 can run in parallel.
- Polish docs/logging tasks T053-T055 can run in parallel.

## Parallel Example: User Story 1

```bash
# Execute US1 tests in parallel
T015 server/tests/contract/assets/enhance-image.test.js
T016 server/tests/integration/asset-enhancement-pipeline.test.js
T017 server/tests/unit/assets/enhancement-worker.test.js
T018 ai-worker/tests/test_enhance_success.py
T019 mobile/src/screens/assets/AssetDetailScreen.states.test.js

# Execute independent client updates in parallel after backend contract merge
T029 mobile/src/api/assetsApi.js
T031 mobile/src/utils/assetMapper.js
```

## Parallel Example: User Story 2

```bash
# Execute US2 tests in parallel
T032 server/tests/contract/auth/me-theme.test.js
T033 server/tests/contract/assets/theme-override.test.js
T034 server/tests/unit/assets/theme-presets.catalog.test.js
T057 server/tests/contract/auth/me-get-theme-shape.test.js
T035 mobile/src/screens/settings/SettingsScreen.test.js
T069 mobile/src/contexts/AuthContext.token-refresh.test.js

# Execute mobile UI updates in parallel after API contract readiness and token-refresh tests are passing
T042 mobile/src/screens/settings/SettingsScreen.js
T043 mobile/src/screens/assets/AssetDetailScreen.js
```

## Parallel Example: User Story 3

```bash
# Execute US3 compatibility tests in parallel
T044 server/tests/contract/assets/contracts-alignment.test.js
T045 server/tests/unit/assets/socket-events.test.js
T046 web/tests/integration/asset-detail.test.tsx
T047 mobile/src/contexts/SocketContext.test.js
```

## Implementation Strategy

### MVP First (US1)

1. Complete Setup (Phase 1).
2. Complete Foundational Tests First (Phase 2A), then Foundational Implementation (Phase 2B).
3. Complete User Story 1 (Phase 3).
4. Validate independent test criteria for US1 before expanding scope.

### Incremental Delivery

1. Ship US1 enhancement trigger and async processing path.
2. Add US2 theme default/override controls.
3. Add US3 compatibility hardening and additive contract verification.
4. Finish with Phase 6 polish and quickstart evidence.

### Team Parallel Strategy

1. Developer A: backend queue/worker and contracts.
2. Developer B: mobile API/detail/settings integration.
3. Developer C: compatibility tests and web mapper/socket updates.
4. Merge by phase checkpoints to keep story-level independence.

## Notes

- [P] tasks target different files with no incomplete dependencies.
- [USx] labels map each task directly to user stories for traceability.
- All tasks include concrete file paths and are immediately actionable.

