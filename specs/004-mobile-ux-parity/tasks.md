---
description: "Task list for feature implementation"
---

# Tasks: Mobile UX Parity (Web -> Mobile)

**Input**: Design documents from /specs/011-mobile-ux-parity/
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and required by this feature because spec marks testing mandatory and constitution enforces test-first workflow.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared constants/contracts and test harness for parity implementation.

- [X] T001 Add canonical category/alias fixture for all clients in specs/011-mobile-ux-parity/contracts/category-aliases.schema.json
- [X] T002 [P] Add mobile parity API contract examples for upload metadata and retry in specs/011-mobile-ux-parity/contracts/assets.mobile-parity.openapi.json
- [X] T003 [P] Add task-scope verification checklist for the five reported regressions in specs/011-mobile-ux-parity/quickstart.md
- [X] T004 Add cross-app parity implementation note in MASTER_PLAN.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared foundations that all user stories depend on.

**CRITICAL**: No user story implementation starts before this phase completes.

- [X] T005 Create canonical category constants and alias map for mobile in mobile/src/config/categories.js
- [X] T006 [P] Create canonical category constants and alias map for web in web/src/lib/categories.ts
- [X] T007 [P] Implement category normalization utility with fallback-to-all behavior in mobile/src/utils/categoryNormalizer.js
- [X] T008 [P] Implement category normalization utility with fallback-to-all behavior in web/src/lib/categoryNormalizer.ts
- [X] T009 Align server category query validation and error message with canonical contract in server/src/modules/assets/assets.routes.js
- [X] T010 [P] Add server contract test for category query enum and 400 behavior in server/tests/contract/assets/get.test.js
- [X] T011 Add category normalization to mobile assets query builder in mobile/src/api/assetsApi.js
- [X] T012 [P] Add category normalization to web assets query builder in web/src/hooks/useAssets.ts
- [X] T013 Implement socket-disconnect polling fallback coordinator hook in mobile/src/hooks/useRealtimeFallback.js
- [X] T014 [P] Add fallback coordinator unit tests for connect/disconnect transitions in mobile/src/hooks/useRealtimeFallback.test.js
- [X] T015 Fix empty image source rendering branch in web image toggle component in web/src/components/assets/ImageToggle.tsx
- [X] T016 [P] Add web regression test for empty image source warning prevention in web/tests/unit/components/ImageToggle.test.tsx

**Checkpoint**: Foundation complete. User story phases can now proceed.

---

## Phase 3: User Story 1 - Login and Browse Assets Library (Priority: P1) MVP

**Goal**: Logged-in users can browse library, filter by status/category, and avoid category-related 400 loops.

**Independent Test**: Login and browse library; apply status/category filters including invalid alias inputs; verify cards render and requests do not loop on 400.

### Tests for User Story 1

- [X] T017 [P] [US1] Add mobile library filter behavior test for status+category combinations in mobile/src/screens/assets/AssetsLibraryScreen.test.js
- [X] T018 [P] [US1] Add mobile category normalization unit tests including fallback-to-all in mobile/src/utils/categoryNormalizer.test.js
- [X] T019 [P] [US1] Add web assets filter regression test for canonicalized category query in web/tests/integration/assets-filter.integration.test.ts
- [X] T020 [P] [US1] Add mobile auth refresh retry test for failed assets list request in mobile/src/services/apiClient.test.js

### Implementation for User Story 1

- [X] T021 [US1] Add category filter state and UI binding in mobile library screen in mobile/src/screens/assets/AssetsLibraryScreen.js
- [X] T022 [US1] Pass normalized category values through infinite list hook in mobile/src/hooks/useInfiniteAssets.js
- [X] T023 [US1] Add category chips/bottom-sheet selection component for mobile library in mobile/src/components/assets/AssetCategoryFilter.js
- [X] T024 [US1] Wire category filter controls into mobile assets screen header in mobile/src/screens/assets/AssetsLibraryScreen.js
- [X] T025 [US1] Align web asset category type to canonical+alias strategy in web/src/types/asset.ts
- [X] T026 [US1] Improve invalid-category API error parsing and client reset behavior in web/src/lib/error-messages.ts

**Checkpoint**: US1 is independently functional and testable.

---

## Phase 4: User Story 2 - Upload and Analyze an Asset (Priority: P2)

**Goal**: Upload flow supports camera/gallery, and preserves user intent with local placeholder assets on camera/upload failure.

**Independent Test**: Pick image from camera/gallery; simulate camera intent failure and upload failure; confirm placeholder entry appears and Retry Upload works.

### Tests for User Story 2

- [X] T027 [P] [US2] Add camera failure fallback test in upload screen in mobile/src/screens/upload/UploadScreen.test.js
- [X] T028 [P] [US2] Add local placeholder lifecycle tests in mobile pending upload hook in mobile/src/hooks/usePendingUploads.test.js
- [X] T029 [P] [US2] Add upload API metadata mapping test in mobile/src/api/uploadApi.test.js
- [X] T030 [P] [US2] Add retry upload from placeholder integration test in mobile/src/screens/upload/UploadScreen.retry.test.js

### Implementation for User Story 2

- [X] T031 [US2] Create pending upload context/store for local placeholder assets in mobile/src/contexts/PendingUploadContext.js
- [X] T032 [US2] Create pending upload state hook with retry transitions in mobile/src/hooks/usePendingUploads.js
- [X] T033 [US2] Handle Android camera intent-resolution failures and gallery fallback in mobile/src/services/imagePicker.js
- [X] T034 [US2] Create local placeholder on post-selection camera/upload failure in mobile/src/screens/upload/UploadScreen.js
- [X] T035 [US2] Add Retry Upload action and transition handling in mobile/src/screens/upload/UploadScreen.js
- [X] T036 [US2] Map filename/size/mime/uploadedAt from upload response in mobile/src/api/uploadApi.js
- [X] T037 [US2] Merge pending upload placeholders into library datasource in mobile/src/hooks/useInfiniteAssets.js
- [X] T038 [US2] Render pending/failed upload card states and actions in mobile/src/components/assets/AssetCard.js

**Checkpoint**: US2 is independently functional and testable.

---

## Phase 5: User Story 3 - View Asset Detail with Status-Based Rendering (Priority: P3)

**Goal**: Detail screen renders correctly by status and shows file metadata immediately while processing.

**Independent Test**: Open detail in processing/failed/partial/active states; verify overlays/messages/retry/archive/image toggle and immediate file metadata.

### Tests for User Story 3

- [X] T039 [P] [US3] Add detail-screen metadata-visible-during-processing test in mobile/src/screens/assets/AssetDetailScreen.test.js
- [X] T040 [P] [US3] Add status rendering matrix tests for active/processing/failed/partial/archived in mobile/src/screens/assets/AssetDetailScreen.states.test.js
- [X] T041 [P] [US3] Add mobile image toggle source selection test in mobile/src/components/assets/ImageToggle.test.js
- [X] T042 [P] [US3] Add server retry endpoint contract test for failed/partial transitions in server/tests/contract/assets/retry.test.js

### Implementation for User Story 3

- [X] T043 [US3] Expand asset detail adapter to include file metadata fields in mobile/src/api/assetsApi.js
- [X] T044 [US3] Render immediate file info section for processing assets in mobile/src/screens/assets/AssetDetailScreen.js
- [X] T045 [US3] Add file metadata formatting helpers with safe fallback values in mobile/src/utils/assetMetadata.js
- [X] T046 [US3] Align retry action and status transition handling in detail screen in mobile/src/screens/assets/AssetDetailScreen.js
- [X] T047 [US3] Ensure archive and retry update local detail cache consistently in mobile/src/hooks/useAsset.js
- [X] T048 [US3] Align web detail metadata labels/format with parity decisions in web/src/pages/app/AssetDetailPage.tsx

**Checkpoint**: US3 is independently functional and testable.

---

## Phase 6: User Story 4 - Realtime Updates (Priority: P4)

**Goal**: Realtime updates remain reliable with reconnect UX and automatic polling fallback.

**Independent Test**: Simulate socket disconnect while on library/detail; verify reconnect banner, polling fallback every 10-15s, auto-stop on reconnect, and update deduplication.

### Tests for User Story 4

- [X] T049 [P] [US4] Add socket-to-polling failover unit tests in mobile/src/contexts/SocketContext.test.js
- [X] T050 [P] [US4] Add reconnecting banner and manual reconnect interaction test in mobile/src/components/ui/ReconnectingBanner.test.js
- [X] T051 [P] [US4] Add polling fallback freshness integration test in mobile/src/screens/assets/AssetsLibraryScreen.realtime.test.js
- [X] T052 [P] [US4] Add duplicate event merge/dedup test in mobile/src/utils/realtimeMerge.test.js

### Implementation for User Story 4

- [X] T053 [US4] Integrate fallback coordinator into socket lifecycle in mobile/src/contexts/SocketContext.js
- [X] T054 [US4] Enable library polling fallback while realtime is disconnected in mobile/src/screens/assets/AssetsLibraryScreen.js
- [X] T055 [US4] Enable detail polling fallback while realtime is disconnected in mobile/src/screens/assets/AssetDetailScreen.js
- [X] T056 [US4] Stop fallback polling and flush missed refresh on reconnect in mobile/src/hooks/useRealtimeFallback.js
- [X] T057 [US4] Wire manual reconnect action to socket service force reconnect in mobile/src/components/ui/ReconnectingBanner.js

**Checkpoint**: US4 is independently functional and testable.

---

## Phase 7: User Story 5 - Settings and Logout (Priority: P5)

**Goal**: Settings shows user and connection status; logout clears session and new local states.

**Independent Test**: Open settings and verify email + connection state; logout clears auth/socket/pending uploads and returns to login.

### Tests for User Story 5

- [X] T058 [P] [US5] Add settings screen connection-state rendering test in mobile/src/screens/settings/SettingsScreen.test.js
- [X] T059 [P] [US5] Add logout cleanup flow test for auth/socket/pending uploads in mobile/src/contexts/AuthContext.logout.test.js

### Implementation for User Story 5

- [X] T060 [US5] Show detailed realtime/fallback connection state in settings screen in mobile/src/screens/settings/SettingsScreen.js
- [X] T061 [US5] Clear pending uploads and socket lifecycle state during logout in mobile/src/contexts/AuthContext.js
- [X] T062 [US5] Ensure logout navigation reset remains stable with new contexts in mobile/src/navigation/RootNavigator.js

**Checkpoint**: US5 is independently functional and testable.

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Final hardening across stories.

- [X] T063 [P] Add accessibility label and 44pt tap-target audit fixes across mobile feature screens in mobile/src/screens/
- [X] T064 [P] Add category/status contract drift tests across server/web/mobile in server/tests/contract/assets/contracts-alignment.test.js
- [X] T065 Run full quickstart regression script and record evidence in specs/011-mobile-ux-parity/quickstart.md
- [X] T066 Optimize mobile assets list rerender/memoization for smooth scroll in mobile/src/screens/assets/AssetsLibraryScreen.js
- [X] T067 Update feature completion summary and rollout notes in MASTER_PLAN.md

---

## Dependencies and Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies.
- Foundational (Phase 2): Depends on Setup and blocks all story phases.
- User Story phases (Phase 3-7): Depend on Foundational completion.
- Polish (Phase 8): Depends on desired story completion.

### User Story Dependencies

- US1 (P1): Starts after Phase 2; no dependency on other stories.
- US2 (P2): Starts after Phase 2; integrates with US1 library but remains independently testable.
- US3 (P3): Starts after Phase 2; relies on upload/detail contract shape.
- US4 (P4): Starts after Phase 2; integrates with US1 and US3 data flows.
- US5 (P5): Starts after Phase 2; integrates with auth and connection state.

### Dependency Graph

```text
Phase1 -> Phase2 -> {US1, US2, US3, US4, US5} -> Phase8
US3 depends on outputs from US2 contract mapping
US4 depends on US1/US3 hooks and realtime handlers
US5 depends on auth + socket + pending upload contexts
```

---

## Parallel Execution Examples

### US1 parallel set

```text
T017 + T018 + T019 + T020
T022 + T023 + T025
```

### US2 parallel set

```text
T027 + T028 + T029 + T030
T032 + T033 + T036 + T038
```

### US3 parallel set

```text
T039 + T040 + T041 + T042
T045 + T047 + T048
```

### US4 parallel set

```text
T049 + T050 + T051 + T052
T054 + T055 + T057
```

### US5 parallel set

```text
T058 + T059
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete US1.
3. Validate independent US1 criteria before expanding scope.

### Incremental Delivery

1. Deliver US1 (auth + library + stable filters).
2. Deliver US2 (upload resilience + placeholders).
3. Deliver US3 (detail completeness + immediate metadata).
4. Deliver US4 (realtime resilience + polling fallback).
5. Deliver US5 (settings/logout parity).
6. Finish with Phase 8 polish.

### Notes

- All tasks use required checklist format.
- [P] marks parallelizable work on separate files.
- [US#] tags are applied only to user story tasks.
- Tests are listed first within each user story to support test-first execution.
