# Feature Specification: Gamification Core

**Feature Branch**: `013-gamification-core`
**Created**: March 22, 2026
**Status**: Draft
**Input**: Create a brownfield feature spec mapping Plan.docx directly into KLECTR

## Clarifications
### Session 2026-03-22
- Q: Maintenance streak ownership → A: Per User (Global user streak)
- Q: "Pristine Collection" Badge Definition → A: All active items >90% (requires at least 1 active asset; permanent once earned)
- Q: Mobile Wait Strategy → A: Allow fire-and-forget
- Q: XP Scaling Rule → A: Fixed +10 XP per successful maintenance

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Dusty Asset (Priority: P1)
Users see their active assets get dusty over time and perform an interactive back-and-forth rubbing gesture on mobile (minimum 2 seconds duration) to restore health, awarding exactly +10 XP. Maintenance is only permitted on assets with `status: 'active'`.

**Independent Test**: Can be tested by manually setting an active asset's `condition.health` below 80, performing a 2-second rub gesture until `cleanedPercentage >= 80`, and verifying the health increases by 25% + streak bonus, visual layers are correctly cleared/adjusted, and +10 XP is awarded.

**Acceptance Scenarios**:
1. **Given** an active asset with health < 80, **When** navigated to, **Then** it shows the corresponding dust visual layer.
2. **Given** an active asset with health < 80, **When** the user performs a back-and-forth rub gesture for at least 2 seconds ensuring `cleanedPercentage >= 80`, **Then** UI celebrates (haptic feedback + success toast, optional partial confetti if in scope) and a background call restores health.
3. **Given** an inactive asset, **When** navigated to, **Then** maintenance interface is disabled.

---

### User Story 2 - Automated Daily Decay (Priority: P1)
Active assets automatically decay in health every 24 hours at 00:00 UTC. The decay equation strictly floors at 0.

**Independent Test**: Force cron execution on backend; verify `condition.health` of active assets drops according to multipliers while inactive items remain unchanged.

**Acceptance Scenarios**:
1. **Given** active assets of various categories, **When** the 00:00 UTC job runs, **Then** health decreases (2% base × category modifier) and `condition.lastDecayDate` is updated.
2. **Given** inactive assets, **When** cron runs, **Then** health/models remain entirely unaffected.
3. **Given** an asset drops below 20 health, **When** recalculating layers, **Then** it applies exactly `['dust_heavy', 'yellowing']` to `asset.visualLayers`.
4. **Given** applying decay, **Then** the condition health will be constrained: `Math.max(0, currentHealth - decay)`.

---

### User Story 3 - Maintenance Streaks & Badges (Priority: P2)
Consistently maintaining *any* eligible active asset daily extends a global user streak.

**Independent Test**: Can be tested by maintaining Asset A on day 1 to start a global streak, and Asset B on day 2. Verify Day 2 calculates streak bonus (+5%) based on the user's global streak, and possibly unlocks "Pristine Collection" if all active items are >90%.

**Acceptance Scenarios**:
1. **Given** the user maintained Asset A yesterday, **When** they successfully maintain Asset B today, **Then** their global streak increases and they gain an extra +5% health restore up to a max cap of +15% total streak bonus.
2. **Given** a successful maintenance, **When** badge conditions are met ("First Clean", "7-Day Streak", "Pristine Collection"), **Then** they are safely appended to the user array (already earned badges are not duplicated or revoked).

---

### Edge Cases
- **Concurrent Requests**: Simultaneous maintain requests use `version` field for optimistic lock (Server returns `409 Conflict`).
- **Optimistic UI Fallback**: Should the background fire-and-forget logic receive a failure (e.g. `400`, `404`, `429`), the mobile client MUST aggressively rollback the UI mask and visual layers to pre-clean state.
- **Parallel Cleaning**: What happens if a user cleans multiple assets in rapid succession before the first API call responds? (Expected: Fire-and-forget; client queues requests and does not block the UI).
- **Cool-down**: Once-per-day rate limit throws `429 Too Many Requests`.

## Requirements *(mandatory)*

### Backend Requirements
- **BE-001**: Cron job runs daily at 00:00 UTC decaying ONLY `active` assets: `Math.max(0, current - (2 * category_modifier))`. Category modifiers: `sneaker: 1.5x`, `lego: 0.8x`, `camera: 1.2x`, `other (default): 1.0x`.
- **BE-002**: Visual layers mapped properly (<20 `['dust_heavy', 'yellowing']`; 20-39 `['dust_heavy']`; 40-59 `['dust_medium']`; 60-79 `['dust_light']`; 80-100 `[]`).
- **BE-003**: Successfully maintaining an asset must correctly compute new `visualLayers`. If health crosses from `<20` to `>=20`, the `yellowing` enum MUST be explicitly stripped off. The new visual state MUST be persisted to the DB.
- **BE-004**: Require optimistic lock (`version` parity payload matching DB) returning `409` on failure.
- **BE-005**: Base maintenance restores 25 health points. Additional global streak adds up to 15% (3 increments of 5) maxing out at 100 health limit.
- **BE-006**: Fixed +10 XP added to nested `user.gamification.totalXp`.
- **BE-007**: Badges calculated matching 3 milestones: First Clean, 7-Day Streak, Pristine Collection condition (requires >0 active assets, all active assets have condition.health >90, permanent once given).
- **BE-008**: Write successful interactions into `asset.maintenanceLogs` array capping to max 50 items to protect document size.

### Mobile Requirements
- **MOB-001**: Require a 2-second continuous back-and-forth rubbing gesture before confirming.
- **MOB-002**: Mobile MUST check `cleanedPercentage >= 80` algorithmically.
- **MOB-003**: Fire-and-forget payload sent after celebration, unlocking offline queue mechanisms. Auth Bearer tokens MUST be explicitly injected and propagated reliably even in queued offline retry scenarios.
- **MOB-004**: Rollback state specifically triggered if backend provides error.

### Error States
- `400 Bad Request`: `cleanedPercentage < 80`, insufficient duration recorded, or asset health already >= 80.
- `403 Forbidden`: User does not own the asset.
- `404 Not Found`: Asset missing or `status !== 'active'`.
- `409 Conflict`: Optimistic locking failure (version mismatch).
- `429 Too Many Requests`: `condition.lastMaintenanceDate` is already today (cooldown).