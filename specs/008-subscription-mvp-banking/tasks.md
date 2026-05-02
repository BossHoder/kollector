# Tasks: Subscription MVP Banking

**Input**: Design documents from `/specs/001-subscription-mvp-banking/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are required for this feature because FR-052 mandates coverage for quota reached, upgrade, downgrade, monthly reset, duplicate request handling, and failure accounting.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared contracts, constants, and client scaffolding used by all stories.

- [X] T001 Register subscription OpenAPI and event schema contracts in server/src/contracts/openapi.js
- [X] T002 [P] Create subscription constants for tiers, limits, statuses, and error codes in server/src/modules/subscription/subscription.constants.js
- [X] T003 [P] Create subscription domain error helpers in server/src/modules/subscription/subscription.errors.js
- [X] T004 [P] Add web subscription type definitions in web/src/types/subscription.ts
- [X] T005 [P] Add mobile subscription type definitions in mobile/src/types/subscription.ts
- [X] T006 [P] Add web subscription API client scaffold in web/src/lib/subscriptionApi.ts
- [X] T007 [P] Add mobile subscription API client scaffold in mobile/src/api/subscriptionApi.ts
- [X] T008 Create shared subscription fixture builders for tests in server/tests/unit/subscription/subscription.fixtures.js

---

## Phase 2A: Foundational Tests First (Blocking Prerequisites)

**Purpose**: Create failing foundational tests before any foundational implementation.

**CRITICAL**: No user story implementation can start until these tests exist and fail.

- [X] T009 Add failing schema test for UserSubscription constraints in server/tests/unit/models/subscription.schema.test.js
- [X] T010 [P] Add failing schema test for SubscriptionUpgradeRequest retention windows in server/tests/unit/models/subscription-upgrade-request.schema.test.js
- [X] T011 [P] Add failing schema test for MonthlyUsageCounter month-key uniqueness in server/tests/unit/models/monthly-usage-counter.schema.test.js
- [X] T012 [P] Add failing quota-ledger idempotency test in server/tests/unit/subscription/quota-ledger.service.test.js
- [X] T013 [P] Add failing contract test for GET /api/subscription/me in server/tests/contract/subscription/subscription-status.contract.test.js
- [X] T014 [P] Add failing contract test for POST/GET /api/subscription/upgrade-requests in server/tests/contract/subscription/upgrade-requests.contract.test.js
- [X] T015 [P] Add failing contract test for admin approve/reject endpoints in server/tests/contract/subscription/admin-upgrade-review.contract.test.js
- [X] T016 [P] Add failing integration test for proof-file and metadata retention lifecycle in server/tests/integration/subscription/proof-retention.lifecycle.test.js
- [X] T017 [P] Add failing schema test for subscription_tier_changed event payload in server/tests/contract/subscription/subscription-tier-event.schema.test.js
- [X] T018 [P] Add failing schema test for subscription_quota_updated event payload in server/tests/contract/subscription/subscription-quota-event.schema.test.js

**Checkpoint**: Foundational failing tests are present and verified failing.

---

## Phase 2B: Foundational Implementation (Blocking Prerequisites)

**Purpose**: Implement core subscription and quota infrastructure after Phase 2A tests fail.

**CRITICAL**: User story work begins only after this phase passes.

- [X] T019 Implement UserSubscription persistence model in server/src/models/Subscription.js
- [X] T020 [P] Implement SubscriptionUpgradeRequest persistence model in server/src/models/SubscriptionUpgradeRequest.js
- [X] T021 [P] Implement MonthlyUsageCounter persistence model in server/src/models/MonthlyUsageCounter.js
- [X] T022 [P] Implement QuotaLedgerEntry persistence model in server/src/models/QuotaLedgerEntry.js
- [X] T023 [P] Implement TierAuditLog persistence model in server/src/models/TierAuditLog.js
- [X] T024 [P] Implement QuotaAuditLog persistence model in server/src/models/QuotaAuditLog.js
- [X] T025 Implement subscription repository access layer in server/src/modules/subscription/subscription.repository.js
- [X] T026 Implement quota reservation/release idempotency service in server/src/modules/subscription/quota.service.js
- [X] T027 Implement subscription lifecycle service (activation, renewal, grace, expiry) in server/src/modules/subscription/subscription.service.js
- [X] T028 Implement subscription controller handlers in server/src/modules/subscription/subscription.controller.js
- [X] T029 Implement subscription and admin route bindings in server/src/modules/subscription/subscription.routes.js
- [X] T030 Implement subscription event emitters and payload mappers in server/src/modules/subscription/subscription.events.js
- [X] T031 Implement maintenance worker for monthly rollover and retention cleanup in server/src/workers/subscription-maintenance.worker.js
- [X] T032 Wire subscription routes and maintenance worker startup in server/src/app.js

**Checkpoint**: Foundation complete. User stories are now independently implementable.

---

## Phase 3: User Story 1 - Free User Reaches Asset Limit (Priority: P1) 🎯 MVP

**Goal**: Enforce Free-tier asset cap at creation without blocking read access to existing data.

**Independent Test**: Create assets as Free user up to 20 (allowed), attempt asset 21 (blocked), verify existing assets remain readable.

### Tests for User Story 1

- [X] T033 [P] [US1] Add contract test for ASSET_LIMIT_REACHED on POST /api/assets in server/tests/contract/assets/asset-limit.contract.test.js
- [X] T034 [P] [US1] Add integration test for Free 20th create allowed and 21st blocked in server/tests/integration/subscription/free-asset-cap.integration.test.js
- [X] T035 [P] [US1] Add web test for asset-cap near-limit and at-limit messaging in web/tests/integration/subscription/asset-cap-banner.test.tsx
- [X] T036 [P] [US1] Add mobile test for asset-cap near-limit and blocked create UX in mobile/src/screens/assets/AssetsLibraryScreen.asset-cap.test.tsx

### Implementation for User Story 1

- [X] T037 [US1] Implement asset-cap entitlement evaluator in server/src/modules/subscription/subscription.service.js
- [X] T038 [US1] Enforce asset-cap check in create asset flow in server/src/modules/assets/assets.controller.js
- [X] T039 [US1] Return standardized ASSET_LIMIT_REACHED error details in server/src/modules/assets/assets.controller.js
- [X] T040 [US1] Expose asset usage values in subscription status response in server/src/modules/subscription/subscription.controller.js
- [X] T041 [US1] Implement web asset-cap warning banner and create guard in web/src/components/subscription/AssetCapBanner.tsx
- [X] T042 [US1] Implement mobile asset-cap warning banner and create guard in mobile/src/components/subscription/AssetCapBanner.tsx

**Checkpoint**: User Story 1 independently functional and testable.

---

## Phase 4: User Story 2 - Free User Reaches Monthly Processing Limit (Priority: P1)

**Goal**: Enforce combined monthly processing quota with reserve-on-accept and exact-once failure refund semantics.

**Independent Test**: Consume 20 processing uses as Free user, verify further analyze/enhance requests are blocked, and confirm terminal internal/system failure triggers one refund.

### Tests for User Story 2

- [X] T043 [P] [US2] Add contract test for PROCESSING_QUOTA_REACHED on POST /api/assets/analyze-queue in server/tests/contract/assets/analyze-queue-quota.contract.test.js
- [X] T044 [P] [US2] Add contract test for PROCESSING_QUOTA_REACHED on POST /api/assets/{id}/enhance-image in server/tests/contract/assets/enhance-image-quota.contract.test.js
- [X] T045 [P] [US2] Add integration test for reserve-on-accept and release-on-terminal-failure in server/tests/integration/subscription/processing-quota-accounting.integration.test.js
- [X] T046 [P] [US2] Add integration test for duplicate blocked retries not charging quota in server/tests/integration/subscription/duplicate-blocked-no-charge.integration.test.js
- [X] T047 [P] [US2] Add integration test for monthly UTC reset rollover in server/tests/integration/subscription/monthly-reset-rollover.integration.test.js
- [X] T048 [P] [US2] Add web test for processing near-limit and reset-date messaging in web/tests/integration/subscription/processing-usage-parity.test.tsx
- [X] T049 [P] [US2] Add mobile test for processing near-limit and reset-date messaging in mobile/src/screens/assets/ProcessingQuotaBanner.test.tsx

### Implementation for User Story 2

- [X] T050 [US2] Apply quota reservation at analyze queue acceptance in server/src/modules/assets/assets.controller.js
- [X] T051 [US2] Apply quota reservation at enhance-image acceptance in server/src/modules/assets/assets.controller.js
- [X] T052 [US2] Implement exact-once quota release on terminal internal/system failure in server/src/modules/subscription/quota.service.js
- [X] T053 [US2] Wire quota consume/release lifecycle into AI worker completion flow in server/src/workers/ai.worker.js
- [X] T054 [US2] Wire quota consume/release lifecycle into enhancement worker completion flow in server/src/workers/asset-enhancement.worker.js
- [X] T055 [US2] Expose processing usage and nextResetAt fields in server/src/modules/subscription/subscription.controller.js
- [X] T056 [US2] Implement web and mobile processing quota warning components in web/src/components/subscription/ProcessingQuotaBanner.tsx and mobile/src/components/subscription/ProcessingQuotaBanner.tsx

**Checkpoint**: User Story 2 independently functional and testable.

---

## Phase 5: User Story 3 - Upgrade to VIP via Bank Transfer (Priority: P1)

**Goal**: Allow users to submit bank-transfer upgrade/renewal requests and receive immediate VIP benefits after admin confirmation.

**Independent Test**: Submit upgrade request, approve as admin, and verify tier, limits, and multiplier update within one minute.

### Tests for User Story 3

- [X] T057 [P] [US3] Add contract test for POST /api/subscription/upgrade-requests in server/tests/contract/subscription/create-upgrade-request.contract.test.js
- [X] T058 [P] [US3] Add contract test for GET /api/subscription/upgrade-requests and /{id} in server/tests/contract/subscription/list-upgrade-requests.contract.test.js
- [X] T059 [P] [US3] Add contract test for admin approve/reject conflict semantics in server/tests/contract/subscription/admin-decision-conflict.contract.test.js
- [X] T060 [P] [US3] Add integration test for admin approval immediate VIP activation in server/tests/integration/subscription/upgrade-activation.integration.test.js
- [X] T061 [P] [US3] Add integration test for proof-file 30-day purge and metadata 180-day retention in server/tests/integration/subscription/retention-windows.integration.test.js
- [X] T062 [P] [US3] Add integration test for tier and decision audit log writes in server/tests/integration/subscription/upgrade-audit.integration.test.js

### Implementation for User Story 3

- [X] T063 [US3] Implement transfer-proof multipart upload handling in server/src/modules/subscription/subscription.controller.js
- [X] T064 [US3] Persist upgrade/renewal request metadata and retention timestamps in server/src/modules/subscription/subscription.service.js
- [X] T065 [US3] Implement user request create/list/detail routes in server/src/modules/subscription/subscription.routes.js
- [X] T066 [US3] Implement admin request list/approve/reject routes in server/src/modules/subscription/subscription.routes.js
- [X] T067 [US3] Implement approval activation and renewal-extension rules in server/src/modules/subscription/subscription.service.js
- [X] T068 [US3] Emit subscription_tier_changed events and tier-audit records on approval in server/src/modules/subscription/subscription.events.js
- [X] T069 [US3] Implement proof-file purge and metadata expiry jobs in server/src/workers/subscription-maintenance.worker.js
- [X] T070 [US3] Implement web and mobile upgrade-request submission flows in web/src/pages/settings/SubscriptionPage.tsx and mobile/src/screens/settings/SubscriptionScreen.tsx

**Checkpoint**: User Story 3 independently functional and testable.

---

## Phase 6: User Story 4 - VIP Expires or Downgrades Without Data Loss (Priority: P1)

**Goal**: Support grace-pending renewal and automatic downgrade rules while preserving all existing user data.

**Independent Test**: Expire VIP with pending pre-expiry renewal (grace active), then verify downgrade after grace elapses if unapproved, with no data deletion.

### Tests for User Story 4

- [X] T071 [P] [US4] Add integration test for grace eligibility when renewal is submitted before expiry in server/tests/integration/subscription/grace-eligibility.integration.test.js
- [X] T072 [P] [US4] Add integration test for automatic downgrade after 72-hour grace timeout in server/tests/integration/subscription/grace-elapse-downgrade.integration.test.js
- [X] T073 [P] [US4] Add integration test ensuring downgrade does not delete existing assets in server/tests/integration/subscription/downgrade-no-data-deletion.integration.test.js
- [X] T074 [P] [US4] Add integration test ensuring only new restricted actions are blocked after downgrade in server/tests/integration/subscription/downgrade-block-new-actions.integration.test.js
- [X] T075 [P] [US4] Add web status-state test for renewal-pending and expired badges in web/tests/integration/subscription/subscription-status-badges.test.tsx

### Implementation for User Story 4

- [X] T076 [US4] Implement expiry-to-grace transition logic in server/src/modules/subscription/subscription.service.js
- [X] T077 [US4] Implement grace-elapse downgrade scheduler logic in server/src/workers/subscription-maintenance.worker.js
- [X] T078 [US4] Implement downgrade-safe enforcement with no data deletion in server/src/modules/subscription/subscription.service.js
- [X] T079 [US4] Emit downgrade and grace-elapsed tier-change events in server/src/modules/subscription/subscription.events.js
- [X] T080 [US4] Implement web renewal-pending and expired state components in web/src/components/subscription/SubscriptionStateBadge.tsx
- [X] T081 [US4] Implement mobile renewal-pending and expired state components in mobile/src/components/subscription/SubscriptionStateBadge.tsx

**Checkpoint**: User Story 4 independently functional and testable.

---

## Phase 7: User Story 5 - Theme Access by Tier Across Settings and Detail (Priority: P2)

**Goal**: Enforce tier-based theme locking with Free access limited to default + light presets and VIP access to all presets.

**Independent Test**: Verify Free lock behavior and VIP unlock behavior on both settings and asset detail, including downgrade visibility behavior.

### Tests for User Story 5

- [X] T082 [P] [US5] Add contract test for THEME_TIER_LOCKED on PATCH /api/assets/{id} in server/tests/contract/assets/theme-tier-lock.contract.test.js
- [X] T083 [P] [US5] Add integration test for Free selectable presets exactly default+light in server/tests/integration/subscription/free-theme-entitlement.integration.test.js
- [X] T084 [P] [US5] Add integration test for VIP full preset access in server/tests/integration/subscription/vip-theme-entitlement.integration.test.js
- [X] T085 [P] [US5] Add integration test for downgrade preserving visibility of already-applied VIP themes in server/tests/integration/subscription/theme-downgrade-visibility.integration.test.js
- [X] T086 [P] [US5] Add mobile parity test for settings/detail lock indicators in mobile/src/screens/settings/ThemeLockParity.test.tsx

### Implementation for User Story 5

- [X] T087 [US5] Enforce tier-aware preset apply validation in server/src/modules/assets/theme-presets.catalog.js
- [X] T088 [US5] Expose selectable and locked preset IDs in subscription status response in server/src/modules/subscription/subscription.controller.js
- [X] T089 [US5] Return THEME_TIER_LOCKED error details on blocked apply in server/src/modules/assets/assets.service.js
- [X] T090 [US5] Implement web settings theme lock/unlock rendering in web/src/pages/settings/SubscriptionPage.tsx
- [X] T091 [US5] Implement web asset-detail theme lock/unlock rendering in web/src/components/assets/ThemeSelector.tsx
- [X] T092 [US5] Implement mobile settings and detail theme lock/unlock rendering in mobile/src/screens/settings/SubscriptionScreen.tsx

**Checkpoint**: User Story 5 independently functional and testable.

---

## Phase 8: User Story 6 - VIP Receives 3x EXP on Maintenance Actions (Priority: P2)

**Goal**: Apply VIP 3x EXP multiplier on maintenance actions with clear downgrade reversion and auditability.

**Independent Test**: Execute identical maintenance actions under Free and VIP tiers, verify 1x vs 3x EXP outcomes, then verify downgrade returns to 1x.

### Tests for User Story 6

- [X] T093 [P] [US6] Add unit test for maintenance EXP multiplier by tier in server/tests/unit/gamification/maintenance-exp-multiplier.test.js
- [X] T094 [P] [US6] Add integration test comparing Free and VIP maintenance EXP outcomes in server/tests/integration/gamification/vip-exp-multiplier.integration.test.js
- [X] T095 [P] [US6] Add integration test for multiplier reset after downgrade in server/tests/integration/gamification/downgrade-exp-multiplier.integration.test.js
- [X] T096 [P] [US6] Add integration test for multiplier and exp-delta audit capture in server/tests/integration/gamification/maintenance-exp-audit.integration.test.js

### Implementation for User Story 6

- [X] T097 [US6] Apply subscription-tier EXP multiplier in maintenance domain logic in server/src/modules/gamification/gamification.service.js
- [X] T098 [US6] Pass subscription tier snapshot into maintenance action handling in server/src/modules/assets/assets.controller.js
- [X] T099 [US6] Persist multiplier and exp-delta audit attributes in maintenance logs in server/src/models/Asset.js
- [X] T100 [US6] Emit maintenance reward telemetry with tier context in server/src/modules/gamification/gamification.service.js
- [X] T101 [US6] Add VIP x3 EXP reward messaging in mobile maintenance UI in mobile/src/screens/assets/AssetDetailScreen.js

**Checkpoint**: User Story 6 independently functional and testable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final rollout safeguards, migration safety, compatibility checks, and evidence capture.

- [X] T102 [P] Implement migration to initialize existing users with Free subscriptions in server/src/modules/subscription/subscription.migration.js
- [X] T103 [P] Add soft-launch enforcement toggle configuration in server/src/config/subscription.config.js
- [X] T104 [P] Add web quota/tier messaging copy map for rollout communication in web/src/lib/subscriptionCopy.ts
- [X] T105 [P] Add mobile quota/tier messaging copy map for rollout communication in mobile/src/config/subscriptionCopy.ts
- [X] T106 Add end-to-end regression suite for quota reached, upgrade, downgrade, reset, duplicate handling, and failure accounting in server/tests/integration/subscription/subscription-regression.integration.test.js
- [X] T107 [P] Add backward-compatibility contract regression for existing realtime/enhancement flows in server/tests/contract/subscription/backward-compatibility.contract.test.js
- [X] T108 Update additive contract migration notes and rollout safeguards in specs/001-subscription-mvp-banking/contracts/migration-notes-1.2.0.md
- [X] T109 Run and document quickstart validation evidence in specs/001-subscription-mvp-banking/quickstart.md
- [X] T110 [P] Add success-criteria evidence index for SC-001..SC-010 in specs/001-subscription-mvp-banking/evidence/README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2A (Foundational Tests First)**: Depends on Phase 1 and must complete with failing tests before implementation.
- **Phase 2B (Foundational Implementation)**: Depends on Phase 2A and blocks all user-story work.
- **Phases 3-8 (User Stories)**: Depend on Phase 2B completion.
- **Phase 9 (Polish)**: Depends on all selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2B; independent from other stories.
- **US2 (P1)**: Can start after Phase 2B; independent from other stories.
- **US3 (P1)**: Can start after Phase 2B; independent from US1/US2 core behavior.
- **US4 (P1)**: Depends on US3 lifecycle paths and uses US1/US2 enforcement behavior.
- **US5 (P2)**: Depends on US3 tier state and existing theme surfaces.
- **US6 (P2)**: Depends on US3 tier state and existing gamification maintenance flow.

### Suggested Story Completion Order

1. US1 + US2 + US3 (parallel after foundation)
2. US4 (after US3, while US5/US6 can start with shared tier primitives)
3. US5 + US6
4. Polish and rollout hardening

### Within Each User Story

- Tests MUST be written and failing before implementation tasks.
- Data and policy logic before endpoint/controller wiring.
- Backend contract behavior before web/mobile UX adaptation.
- Story checkpoint validation before moving to next dependent story.

---

## Parallel Opportunities

- Setup tasks T002-T007 can run in parallel after T001.
- Foundational test tasks T010-T018 can run in parallel after T009 scaffolding.
- Foundational model tasks T020-T024 can run in parallel after schema tests fail.
- US1 tests T033-T036 can run in parallel.
- US2 tests T043-T049 can run in parallel.
- US3 tests T057-T062 can run in parallel.
- US4 tests T071-T075 can run in parallel.
- US5 tests T082-T086 can run in parallel.
- US6 tests T093-T096 can run in parallel.
- Polish docs/config tasks T102-T105 and T107-T110 can run in parallel.

## Parallel Example: User Story 1

```bash
# Run US1 tests in parallel
T033 server/tests/contract/assets/asset-limit.contract.test.js
T034 server/tests/integration/subscription/free-asset-cap.integration.test.js
T035 web/tests/integration/subscription/asset-cap-banner.test.tsx
T036 mobile/src/screens/assets/AssetsLibraryScreen.asset-cap.test.tsx
```

## Parallel Example: User Story 2

```bash
# Run US2 quota tests in parallel
T043 server/tests/contract/assets/analyze-queue-quota.contract.test.js
T044 server/tests/contract/assets/enhance-image-quota.contract.test.js
T045 server/tests/integration/subscription/processing-quota-accounting.integration.test.js
T046 server/tests/integration/subscription/duplicate-blocked-no-charge.integration.test.js
T047 server/tests/integration/subscription/monthly-reset-rollover.integration.test.js
```

## Parallel Example: User Story 3

```bash
# Run US3 workflow tests in parallel
T057 server/tests/contract/subscription/create-upgrade-request.contract.test.js
T058 server/tests/contract/subscription/list-upgrade-requests.contract.test.js
T059 server/tests/contract/subscription/admin-decision-conflict.contract.test.js
T060 server/tests/integration/subscription/upgrade-activation.integration.test.js
T061 server/tests/integration/subscription/retention-windows.integration.test.js
```

## Parallel Example: User Story 4

```bash
# Run US4 lifecycle tests in parallel
T071 server/tests/integration/subscription/grace-eligibility.integration.test.js
T072 server/tests/integration/subscription/grace-elapse-downgrade.integration.test.js
T073 server/tests/integration/subscription/downgrade-no-data-deletion.integration.test.js
T074 server/tests/integration/subscription/downgrade-block-new-actions.integration.test.js
```

## Parallel Example: User Story 5

```bash
# Run US5 theme entitlement tests in parallel
T082 server/tests/contract/assets/theme-tier-lock.contract.test.js
T083 server/tests/integration/subscription/free-theme-entitlement.integration.test.js
T084 server/tests/integration/subscription/vip-theme-entitlement.integration.test.js
T085 server/tests/integration/subscription/theme-downgrade-visibility.integration.test.js
```

## Parallel Example: User Story 6

```bash
# Run US6 EXP multiplier tests in parallel
T093 server/tests/unit/gamification/maintenance-exp-multiplier.test.js
T094 server/tests/integration/gamification/vip-exp-multiplier.integration.test.js
T095 server/tests/integration/gamification/downgrade-exp-multiplier.integration.test.js
T096 server/tests/integration/gamification/maintenance-exp-audit.integration.test.js
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phases 1, 2A, and 2B.
2. Deliver US1 asset-cap behavior and validate independently.
3. Demo/readiness gate before expanding scope.

### Incremental Delivery

1. Deliver US2 processing quota fairness (reserve/release, duplicate handling, monthly reset).
2. Deliver US3 banking upgrade and admin approval pipeline.
3. Deliver US4 expiry/grace/downgrade lifecycle protections.
4. Deliver US5 theme lock/unlock parity.
5. Deliver US6 VIP 3x EXP behavior.
6. Execute Phase 9 rollout safeguards and evidence capture.

### Parallel Team Strategy

1. Team A: Subscription domain models/services/routes and admin workflow.
2. Team B: Asset/analyze/enhance quota integration and worker accounting.
3. Team C: Web/mobile quota and theme UX parity.
4. Team D: Gamification multiplier integration and cross-cutting regression.

---

## Notes

- [P] indicates tasks that can run in parallel safely on different files with no unfinished dependency.
- [USx] labels map each task to a specific user story for traceability and independent validation.
- Every task includes explicit file paths to make execution unambiguous for implementation agents.
