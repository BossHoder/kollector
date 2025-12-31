# Tasks: FE MVP Integration

**Input**: Design documents from `/specs/010-fe-mvp-integration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are MANDATORY per Constitution principle III (Test-First).
Write tests FIRST; they MUST fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

All paths relative to `web/` directory.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, TypeScript migration, and tooling setup

- [X] T001 Initialize TypeScript configuration in web/tsconfig.json
- [X] T002 [P] Convert web/vite.config.js to web/vite.config.ts
- [X] T003 [P] Install dependencies: react-router-dom@7, @tanstack/react-query@5, socket.io-client@4, react-hook-form, zod, @hookform/resolvers
- [X] T004 [P] Install dev dependencies: typescript, @types/react, @types/react-dom, vitest, @testing-library/react, @testing-library/jest-dom, msw
- [X] T005 [P] Configure Tailwind CSS with Stitch design tokens in web/tailwind.config.ts
- [X] T006 [P] Update web/src/index.css with Tailwind base and Stitch color variables
- [X] T007 Rename web/src/main.jsx to web/src/main.tsx and update imports
- [X] T008 Rename web/src/App.jsx to web/src/App.tsx and add basic structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Test Infrastructure

- [X] T009 Create Vitest setup in web/tests/setup.ts with RTL and jsdom
- [X] T010 [P] Create MSW server setup in web/tests/mocks/server.ts
- [X] T011 [P] Create MSW handlers skeleton in web/tests/mocks/handlers.ts (auth, assets endpoints)

### Type Definitions (from data-model.md)

- [X] T012 [P] Create User and AuthState types in web/src/types/user.ts
- [X] T013 [P] Create Asset, AssetCategory, AssetStatus, AIMetadata types in web/src/types/asset.ts
- [X] T014 [P] Create API request/response types in web/src/types/api.ts
- [X] T015 [P] Create AssetProcessedEvent socket types in web/src/types/socket.ts

### Core Libraries (test-first)

- [X] T016 Write unit tests for api-client in web/tests/unit/api-client.test.ts (must fail)
- [X] T017 Implement fetch wrapper with token refresh in web/src/lib/api-client.ts
- [X] T018 [P] Write unit tests for auth helpers in web/tests/unit/auth.test.ts (must fail)
- [X] T019 [P] Implement token storage and refresh logic in web/src/lib/auth.ts
- [X] T020 Write unit tests for status-display mapping in web/tests/unit/status-display.test.ts (must fail)
- [X] T021 Implement STATUS_DISPLAY mapping utility in web/src/lib/status-display.ts
- [X] T022 [P] Create error message mapping utility in web/src/lib/error-messages.ts
- [X] T023 Write unit tests for socket client in web/tests/unit/socket.test.ts (must fail)
- [X] T024 Implement socket.io client setup in web/src/lib/socket.ts

### Context Providers

- [X] T025 Create AuthContext provider in web/src/contexts/AuthContext.tsx
- [X] T026 [P] Create SocketContext provider in web/src/contexts/SocketContext.tsx
- [X] T027 [P] Create ToastContext provider in web/src/contexts/ToastContext.tsx

### Base UI Components

- [X] T028 [P] Create Button component in web/src/components/ui/Button.tsx (from Stitch prototype)
- [X] T029 [P] Create Input component in web/src/components/ui/Input.tsx (from Stitch prototype)
- [X] T030 [P] Create StatusPill component in web/src/components/ui/StatusPill.tsx (Ready/Processing/Failed/Partial/Archived)
- [X] T031 [P] Create Toast component in web/src/components/ui/Toast.tsx
- [X] T032 [P] Create Skeleton loading component in web/src/components/ui/Skeleton.tsx

### Layout Components

- [X] T033 Create Header component in web/src/components/layout/Header.tsx (with socket status indicator)
- [X] T034 [P] Create PublicLayout component in web/src/components/layout/PublicLayout.tsx
- [X] T035 [P] Create AppLayout component in web/src/components/layout/AppLayout.tsx
- [X] T036 Create ProtectedRoute component in web/src/components/layout/ProtectedRoute.tsx

### Router Setup

- [X] T037 Create React Router v7 configuration in web/src/router.tsx with route structure

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Login and View Assets (Priority: P1) 🎯 MVP

**Goal**: User logs in and sees their asset collection with status indicators

**Independent Test**: Log in with valid credentials → see assets grid with status pills (Ready/Processing/Failed)

### Tests for User Story 1 (MANDATORY, write first) ⚠️

- [X] T038 [P] [US1] Write integration test for login flow in web/tests/integration/login-flow.test.tsx (must fail)
- [X] T039 [P] [US1] Write integration test for assets list in web/tests/integration/assets-list.test.tsx (must fail)
- [X] T040 [P] [US1] Add MSW handlers for POST /api/auth/login in web/tests/mocks/handlers.ts
- [X] T041 [P] [US1] Add MSW handlers for GET /api/assets in web/tests/mocks/handlers.ts

### Hooks for User Story 1

- [X] T042 [US1] Create useAuth hook in web/src/hooks/useAuth.ts
- [X] T043 [US1] Create useAssets hook with TanStack Query pagination in web/src/hooks/useAssets.ts

### Forms for User Story 1

- [X] T044 [US1] Create LoginForm component in web/src/components/forms/LoginForm.tsx (React Hook Form + Zod)

### Asset Components for User Story 1

- [X] T045 [P] [US1] Create AssetCard component in web/src/components/assets/AssetCard.tsx
- [X] T046 [P] [US1] Create AssetGrid component in web/src/components/assets/AssetGrid.tsx
- [X] T047 [US1] Create AssetFilters component in web/src/components/assets/AssetFilters.tsx (category + status)

### Pages for User Story 1

- [X] T048 [US1] Create LoginPage in web/src/pages/public/LoginPage.tsx (matching stitch_kollector_login_page)
- [X] T049 [US1] Create AssetsPage in web/src/pages/app/AssetsPage.tsx (matching stitch_kollector_assets_library_page)

### Integration for User Story 1

- [X] T050 [US1] Wire up LoginPage with AuthContext and router navigation
- [X] T051 [US1] Wire up AssetsPage with useAssets hook and filters
- [X] T052 [US1] Add token refresh interceptor integration to api-client
- [X] T053 [US1] Verify all US1 integration tests pass

**Checkpoint**: User Story 1 complete - users can log in and view their assets

---

## Phase 4: User Story 2 - Upload and Analyze New Asset (Priority: P2)

**Goal**: User uploads image with category, system queues for AI, redirects to detail page

**Independent Test**: Upload image with category → receive 202 → see detail page with "Processing" status

### Tests for User Story 2 (MANDATORY, write first) ⚠️

- [X] T054 [P] [US2] Write integration test for upload flow in web/tests/integration/upload-flow.test.tsx (must fail)
- [X] T055 [P] [US2] Add MSW handler for POST /api/assets/analyze-queue in web/tests/mocks/handlers.ts

### Components for User Story 2

- [X] T056 [US2] Create UploadForm component in web/src/components/forms/UploadForm.tsx (drag-drop, file picker, category select)
- [X] T057 [P] [US2] Create ProcessingOverlay component in web/src/components/assets/ProcessingOverlay.tsx

### Pages for User Story 2

- [X] T058 [US2] Create UploadPage in web/src/pages/app/UploadPage.tsx (matching stitch_kollector_upload_page)

### Integration for User Story 2

- [X] T059 [US2] Implement file validation (JPEG/PNG, ≤10MB) in UploadForm
- [X] T060 [US2] Wire up UploadPage with multipart POST and 202 redirect to detail page
- [X] T061 [US2] Verify all US2 integration tests pass

**Checkpoint**: User Story 2 complete - users can upload assets for AI processing

---

## Phase 5: User Story 3 - View Asset Detail with Toggle (Priority: P3)

**Goal**: User views asset detail page with AI metadata, image toggle, status-specific UI

**Independent Test**: Click asset card → see detail page with AI metadata, confidence bars, image toggle

### Tests for User Story 3 (MANDATORY, write first) ⚠️

- [X] T062 [P] [US3] Write integration test for asset detail in web/tests/integration/asset-detail.test.tsx (must fail)
- [X] T063 [P] [US3] Add MSW handler for GET /api/assets/:id in web/tests/mocks/handlers.ts

### Hooks for User Story 3

- [X] T064 [US3] Create useAsset hook with TanStack Query in web/src/hooks/useAsset.ts

### Components for User Story 3

- [X] T065 [P] [US3] Create ConfidenceBar component in web/src/components/ui/ConfidenceBar.tsx
- [X] T066 [P] [US3] Create ImageToggle component in web/src/components/assets/ImageToggle.tsx (Processed/Original)

### Pages for User Story 3

- [X] T067 [US3] Create AssetDetailPage in web/src/pages/app/AssetDetailPage.tsx (matching stitch_kollector_assets_detail_page)

### Integration for User Story 3

- [X] T068 [US3] Implement status-specific UI rendering (Ready/Processing/Failed/Partial/Archived)
- [X] T069 [US3] Add retry button functionality for failed assets (POST /api/assets/:id/retry)
- [X] T070 [US3] Verify all US3 integration tests pass

**Checkpoint**: User Story 3 complete - users can view full asset details

---

## Phase 6: User Story 4 - Realtime Updates via Socket (Priority: P4)

**Goal**: User receives realtime updates when assets complete AI processing

**Independent Test**: Upload asset → navigate to detail → wait for socket event → status updates without refresh

### Tests for User Story 4 (MANDATORY, write first) ⚠️

- [X] T071 [P] [US4] Write integration test for socket updates in web/tests/integration/socket-updates.test.tsx (must fail)

### Hooks for User Story 4

- [X] T072 [US4] Create useSocket hook in web/src/hooks/useSocket.ts
- [X] T073 [US4] Create useToast hook in web/src/hooks/useToast.ts

### Integration for User Story 4

- [X] T074 [US4] Connect SocketContext with AuthContext (initialize after login)
- [X] T075 [US4] Implement asset_processed event handler to update TanStack Query cache
- [X] T076 [US4] Add toast notification on asset_processed events
- [X] T077 [US4] Add "Reconnecting..." banner component on socket disconnect
- [X] T078 [US4] Integrate socket status indicator in Header (green/red dot)
- [X] T079 [US4] Verify all US4 integration tests pass

**Checkpoint**: User Story 4 complete - realtime updates working

---

## Phase 7: User Story 5 - Settings and Logout (Priority: P5)

**Goal**: User can view settings and logout

**Independent Test**: Navigate to /app/settings → see profile + socket status → click logout → redirect to login

### Tests for User Story 5 (MANDATORY, write first) ⚠️

- [X] T080 [P] [US5] Write integration test for settings/logout in web/tests/integration/settings-logout.test.tsx (must fail)

### Pages for User Story 5

- [X] T081 [US5] Create SettingsPage in web/src/pages/app/SettingsPage.tsx

### Integration for User Story 5

- [X] T082 [US5] Display user email and socket connection status on settings page
- [X] T083 [US5] Implement logout: clear tokens, disconnect socket, redirect to /login
- [X] T084 [US5] Verify all US5 integration tests pass

**Checkpoint**: User Story 5 complete - session management working

---

## Phase 8: User Story 6 - Public Pages (Priority: P6)

**Goal**: Unauthenticated users can access home and register pages

**Independent Test**: Visit / → see home page → navigate to /register → register successfully → redirect to assets

### Tests for User Story 6 (MANDATORY, write first) ⚠️

- [X] T085 [P] [US6] Write integration test for register flow in web/tests/integration/register-flow.test.tsx (must fail)
- [X] T086 [P] [US6] Add MSW handler for POST /api/auth/register in web/tests/mocks/handlers.ts

### Forms for User Story 6

- [X] T087 [US6] Create RegisterForm component in web/src/components/forms/RegisterForm.tsx (with password confirm)

### Pages for User Story 6

- [X] T088 [P] [US6] Create HomePage in web/src/pages/public/HomePage.tsx (matching stitch_kollector_home_page)
- [X] T089 [US6] Create RegisterPage in web/src/pages/public/RegisterPage.tsx (matching stitch_kollector_register_page)

### Integration for User Story 6

- [X] T090 [US6] Wire up RegisterPage with auto-login on 201 success
- [X] T091 [US6] Handle 409 conflict error for duplicate email
- [X] T092 [US6] Verify all US6 integration tests pass

**Checkpoint**: User Story 6 complete - public pages working

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T093 [P] Add loading states and skeleton placeholders across all pages
- [X] T094 [P] Implement FR-A11Y-001 to FR-A11Y-005: semantic HTML, labels, focus management, keyboard nav
- [X] T095 [P] Add offline detection banner ("Bạn đang ngoại tuyến")
- [X] T096 [P] Add upload-in-progress navigation confirmation dialog
- [X] T097 Performance: Verify login+list <3s, upload redirect <2s
- [X] T098 Run full test suite and fix any regressions
- [X] T099 Validate all pages match Stitch prototypes (SC-005)
- [X] T100 Run quickstart.md validation with fresh clone

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Login/Assets) | Foundational | - |
| US2 (Upload) | Foundational | US1 (uses ProtectedRoute) |
| US3 (Detail) | Foundational | US1, US2 |
| US4 (Socket) | Foundational, US1 (login triggers socket) | US2, US3 |
| US5 (Settings) | Foundational, US4 (socket status) | US2, US3 |
| US6 (Public) | Foundational | US1-US5 |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Hooks before components that use them
3. Components before pages that compose them
4. Pages before integration wiring
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T002, T003, T004, T005, T006 can run in parallel
```

**Phase 2 (Foundational)**:
```
Parallel Group A: T010, T011 (MSW setup)
Parallel Group B: T012, T013, T014, T015 (all type definitions)
Parallel Group C: T016+T018+T20+T23 (all test files), then implementations
Parallel Group D: T025, T026, T027 (context providers)
Parallel Group E: T028, T029, T030, T031, T032 (UI components)
Parallel Group F: T033, T034, T035 (layout components)
```

**User Story Phases**:
```
Once Foundational completes:
- Developer A: US1 (Login/Assets) → US4 (Socket)
- Developer B: US2 (Upload) → US3 (Detail)
- Developer C: US6 (Public) → US5 (Settings)
```

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
T038: "Write integration test for login flow"
T039: "Write integration test for assets list"
T040: "Add MSW handlers for POST /api/auth/login"
T041: "Add MSW handlers for GET /api/assets"

# Then launch parallel components:
T045: "Create AssetCard component"
T046: "Create AssetGrid component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~8 tasks)
2. Complete Phase 2: Foundational (~29 tasks) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (~16 tasks)
4. **STOP and VALIDATE**: Test US1 independently
5. Deploy/demo if ready - users can log in and view assets!

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Login/Assets) → Test → Deploy (MVP!)
3. Add US2 (Upload) → Test → Deploy
4. Add US3 (Detail) → Test → Deploy
5. Add US4 (Socket) → Test → Deploy
6. Add US5 (Settings) → Test → Deploy
7. Add US6 (Public) → Test → Deploy
8. Polish phase → Final release

---

## Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 8 | 5 parallel groups |
| Phase 2: Foundational | 29 | 6 parallel groups |
| Phase 3: US1 Login/Assets | 16 | 4 parallel groups |
| Phase 4: US2 Upload | 8 | 2 parallel groups |
| Phase 5: US3 Detail | 9 | 2 parallel groups |
| Phase 6: US4 Socket | 9 | 1 parallel group |
| Phase 7: US5 Settings | 5 | 1 parallel group |
| Phase 8: US6 Public | 8 | 2 parallel groups |
| Phase 9: Polish | 8 | 4 parallel groups |
| **Total** | **100** | - |

**MVP Scope**: Phases 1-3 (53 tasks) → Delivers Login + Assets List

**Full Feature**: Phases 1-9 (100 tasks) → Delivers complete FE MVP
