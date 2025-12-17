# Tasks: Foundation Backend Setup

**Feature**: `001-foundation-backend-setup`
**Status**: In Progress

## Phase 1: Setup
**Goal**: Initialize the project structure and dependencies for the backend foundation.

- [ ] T001 Install required dependencies (express, mongoose, jsonwebtoken, argon2, cors, helmet, winston, cookie-parser) in server/package.json
- [ ] T002 Configure MongoDB connection with Mongoose in server/src/config/database.js
- [ ] T003 Configure Express app with middleware (cors, helmet, json, cookie-parser) in server/src/app.js
- [ ] T004 Create shared error handling middleware in server/src/middleware/error.middleware.js

## Phase 2: Foundational
**Goal**: Implement core data models and shared middleware required by all user stories.

- [ ] T005 [P] Create User Mongoose model with gamification fields in server/src/models/User.js
- [ ] T006 [P] Create Asset Mongoose model with visualLayers and health fields in server/src/models/Asset.js
- [ ] T007 Create authentication middleware (JWT verification) in server/src/middleware/auth.middleware.js
- [ ] T008 Create request validation middleware (using express-validator) in server/src/middleware/validate.middleware.js

## Phase 3: User Story 1 - New User Registration (P1)
**Goal**: Allow new users to register with email and password.
**Independent Test**: Submit registration form data and verify account creation response.

- [ ] T009 [P] [US1] Create contract test for registration endpoint in server/tests/contract/auth/register.test.js
- [ ] T010 [US1] Implement AuthService.register method in server/src/modules/auth/auth.service.js
- [ ] T011 [US1] Implement AuthController.register method in server/src/modules/auth/auth.controller.js
- [ ] T012 [US1] Setup auth routes and mount /register endpoint in server/src/modules/auth/auth.routes.js
- [ ] T013 [US1] Register auth routes in server/src/app.js

## Phase 4: User Story 2 - Returning User Login (P1)
**Goal**: Allow registered users to log in and receive access/refresh tokens.
**Independent Test**: Submit valid credentials and verify token response.

- [ ] T014 [P] [US2] Create contract test for login and refresh endpoints in server/tests/contract/auth/login.test.js
- [ ] T015 [US2] Implement AuthService.login method in server/src/modules/auth/auth.service.js
- [ ] T016 [US2] Implement AuthController.login method in server/src/modules/auth/auth.controller.js
- [ ] T017 [US2] Implement AuthService.refreshToken method in server/src/modules/auth/auth.service.js
- [ ] T018 [US2] Implement AuthController.refreshToken method in server/src/modules/auth/auth.controller.js
- [ ] T019 [US2] Add /login and /refresh endpoints to server/src/modules/auth/auth.routes.js

## Phase 5: User Story 3 - Add New Collectible Asset (P2)
**Goal**: Allow authenticated users to create new assets.
**Independent Test**: Create an asset via API and verify it appears in the user's collection.

- [ ] T020 [P] [US3] Create contract test for create asset endpoint in server/tests/contract/assets/create.test.js
- [ ] T021 [US3] Implement AssetService.createAsset method in server/src/modules/assets/assets.service.js
- [ ] T022 [US3] Implement AssetController.createAsset method in server/src/modules/assets/assets.controller.js
- [ ] T023 [US3] Setup assets routes and mount POST / endpoint in server/src/modules/assets/assets.routes.js
- [ ] T024 [US3] Register assets routes in server/src/app.js

## Phase 6: User Story 4 - View Collection (P2)
**Goal**: Allow authenticated users to list their assets with pagination.
**Independent Test**: Query assets endpoint and verify response contains user's items.

- [ ] T025 [P] [US4] Create contract test for list assets endpoint in server/tests/contract/assets/list.test.js
- [ ] T026 [US4] Implement AssetService.listAssets method (with cursor pagination) in server/src/modules/assets/assets.service.js
- [ ] T027 [US4] Implement AssetController.listAssets method in server/src/modules/assets/assets.controller.js
- [ ] T028 [US4] Add GET / endpoint to server/src/modules/assets/assets.routes.js

## Phase 7: User Story 5 - View Single Asset Details (P3)
**Goal**: Allow authenticated users to view details of a specific asset.
**Independent Test**: Request specific asset by ID and verify details.

- [ ] T029 [P] [US5] Create contract test for get asset endpoint in server/tests/contract/assets/get.test.js
- [ ] T030 [US5] Implement AssetService.getAssetById method in server/src/modules/assets/assets.service.js
- [ ] T031 [US5] Implement AssetController.getAssetById method in server/src/modules/assets/assets.controller.js
- [ ] T032 [US5] Add GET /:id endpoint to server/src/modules/assets/assets.routes.js

## Phase 8: User Story 6 - Update Asset Information (P3)
**Goal**: Allow authenticated users to update their assets.
**Independent Test**: Modify an asset and verify changes persist.

- [ ] T033 [P] [US6] Create contract test for update asset endpoint in server/tests/contract/assets/update.test.js
- [ ] T034 [US6] Implement AssetService.updateAsset method in server/src/modules/assets/assets.service.js
- [ ] T035 [US6] Implement AssetController.updateAsset method in server/src/modules/assets/assets.controller.js
- [ ] T036 [US6] Add PATCH /:id endpoint to server/src/modules/assets/assets.routes.js

## Phase 9: User Story 7 - Delete Asset (P3)
**Goal**: Allow authenticated users to delete their assets.
**Independent Test**: Delete an asset and verify it is removed.

- [ ] T037 [P] [US7] Create contract test for delete asset endpoint in server/tests/contract/assets/delete.test.js
- [ ] T038 [US7] Implement AssetService.deleteAsset method in server/src/modules/assets/assets.service.js
- [ ] T039 [US7] Implement AssetController.deleteAsset method in server/src/modules/assets/assets.controller.js
- [ ] T040 [US7] Add DELETE /:id endpoint to server/src/modules/assets/assets.routes.js

## Phase 10: Polish & Cross-Cutting Concerns
**Goal**: Finalize error handling, logging, and ensure code quality.

- [ ] T041 Ensure consistent error responses across all endpoints in server/src/middleware/error.middleware.js
- [ ] T042 Add structured logging (winston) to all controllers in server/src/modules/auth/auth.controller.js and server/src/modules/assets/assets.controller.js
- [ ] T043 Verify all Mongoose models match strict schema definitions in server/src/models/

## Dependencies

1. **Setup** (T001-T004) must be completed first.
2. **Foundational** (T005-T008) must be completed before any User Story phases.
3. **User Stories** can be implemented sequentially (US1 -> US7) or in parallel groups if teams are split, but US1 & US2 (Auth) are prerequisites for US3-US7 (Assets) integration testing.
   - US1 & US2 (Auth) -> Blocks US3-US7
   - US3 (Create) -> Blocks US4-US7 (need data to view/edit)

## Parallel Execution Opportunities

- **Models**: T005 (User) and T006 (Asset) can be implemented in parallel.
- **Contract Tests**: All contract test tasks (T009, T014, T020, T025, T029, T033, T037) can be written in parallel with or before implementation tasks.
- **Asset Operations**: Once US3 (Create) is done, US4, US5, US6, US7 can be implemented somewhat in parallel, though they share controller/service files so merge conflicts are possible.

## Implementation Strategy

- **MVP Scope**: Complete Phases 1-6 (Setup through View Collection) to have a functional app where users can register, login, add items, and see them.
- **Incremental Delivery**: Deploy after Phase 4 (Auth) to verify user management, then after Phase 6 (Basic Asset Management).
