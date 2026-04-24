# Tasks: Gamification Core

**Input**: Design documents from `/specs/013-gamification-core/`
Prerequisites bound linearly to KLECTR repo conventions and Plan.docx source.

## Phase 1: Foundational Schema (Blocking)

- [X] T001 [P] Extend `User.js` schema with nested `gamification.totalXp`, `gamification.maintenanceStreak`, `gamification.lastMaintenanceDate`, and `gamification.badges` attributes in `server/src/models/User.js`.
- [X] T002 [P] Extend `Asset.js` schema with `condition.health`, `condition.lastDecayDate`, `condition.lastMaintenanceDate`, `condition.maintenanceCount`, `visualLayers` and `maintenanceLogs` attributes in `server/src/models/Asset.js`.
- [X] T003 Ensure `version` attribute concurrency logic is strictly enabled within `Asset.js` updates.

## Phase 2: User Story 1 - Maintain Dusty Asset (Priority: P1)

### Tests for User Story 1 ⚠️
- [X] T004 [P] [US1] Create API endpoint contract tests in `server/tests/contract/assets.maintain.test.js` covering the new `POST /api/assets/{id}/maintain` 200 shape and explicit 400, 403, 404, 409, 429 error pathways.
- [X] T005 [P] [US1] Write Jest tests for TanStack Query API wrapper (`mobile/src/api/gamification.ts`) validating optimistic rollback behavior, Bearer Auth injection, and fire-and-forget success paths BEFORE implementation.
- [X] T006 [P] [US1] Write FE tests for offline queue interceptors (`mobile/src/utils/offlineQueue.ts`) validating storage replay and Bearer Auth token propagation on network reconnect.

### Backend Implementation
- [X] T007 [P] [US1] Register OpenAPI path configurations globally matching `gamification.openapi.json` within existing backend specs (`POST /api/assets/{id}/maintain`).
- [X] T008 [US1] Implement `gamification.service.js` logic: validating `status === 'active'` (blocking if not), checking 24h duration cooldown, and checking lock version. Calculate base limits and enforce 100 health cap limit.
- [X] T009 [US1] Expand `gamification.service.js` to compute `visualLayers` limits: removing `yellowing` upon hitting `>=20`, clearing all dust arrays on successful restore `>=80`. **Persist** these computed arrays to the DB alongside the new health amount.
- [X] T010 [US1] Mount `router.post('/:assetId/maintain')` in `server/src/modules/assets/assets.routes.js`, wiring to the controller.
- [X] T011 [US1] Bind controller response to return strict `{ previousHealth, newHealth, xpAwarded, streakDays, badgesUnlocked }` response map.
- [X] T012 [US1] Append the exact +10 XP metrics to the embedded `maintenanceLogs` array using `$push` with a `$slice: -50` truncation limit to prevent unbounded document size growth, and increment `condition.maintenanceCount` upon successful completion.

### Mobile Implementation
- [X] T013 [P] [US1] Implement offline queue interceptors reacting strictly to `400/409/429` failure rollbacks in `mobile/src/utils/offlineQueue.ts`, injecting Bearer Auth directly into queued re-sync payloads.
- [X] T014 [US1] Implement `AssetMaintenanceRubMask.tsx` Reanimated/Skia mask ensuring minimum *2-second continuous back-and-forth* touch interactions before `cleanedPercentage >= 80` unlocks.
- [X] T015 [US1] Inject haptic feedback triggers across rendering boundaries directly into `AssetMaintenanceRubMask.tsx` (or haptic + success toast + partial confetti) instead of screen components to bind directly to gesture lifecycle for success UX celebration.
- [X] T016 [US1] Combine the offlineQueue hook and RubMask interaction together in `mobile/src/screens/AssetDetailScreen.tsx` testing the fire-and-forget sync.

## Phase 3: User Story 2 - Automated Daily Decay (Priority: P1)

### Backend Worker
- [X] T017 [P] [US2] Create unit tests verifying decay limits: it drops items strictly on `status === 'active'`, floors Math.max(0, newHealth), applies correct category modifiers, and correctly remaps multi-layer `['dust_heavy', 'yellowing']` status strictly when dropping `<20`.
- [X] T018 [US2] Implement bulk-write cursor aggregation inside `server/src/workers/cron.decay.js` ensuring schema updates **persist** the new floored `condition.health`, `condition.lastDecayDate`, and the computed `visualLayers` arrays to the Mongo database. (No Redis/BullMQ required for this db-side aggregation).
- [X] T019 [US2] Wire Cron execution schedule matching `00:00 UTC`.

## Phase 4: User Story 3 - Maintenance Streaks & Badges (Priority: P2)

- [X] T020 [P] [US3] Add unit tests ensuring the global user streak is safely decoupled from `assetId` logic during subsequent days (eg. maintaining Asset A and Asset B).
- [X] T021 [US3] Expand `gamification.service.js` to inspect user-level `gamification.lastMaintenanceDate` ensuring consecutive (+5%) scaling behavior capping strictly at a maximum bonus of 15% (3 increments).
- [X] T022 [US3] Introduce badge extraction loop enforcing milestones (`First Clean`, `7-Day Streak`) and mapping aggregation verifying the `Pristine Collection` rules (>0 active items, all >90 health). Ensure earned badges arrays do not duplicate existing string entries.

## Polish
- [ ] T023 [P] Final contract tests validation across completed paths and cleanup logic against codebase conventions.
