# Data Model: Gamification Core

This document outlines the data schema updates necessary for the gamification-core feature. It aligns strictly with KLECTR's brownfield nested conventions.

## Mongoose Schema Additions

### User Collection (`server/src/models/User.js`)
Model the user's gamification state under a new/extended nested `gamification` object to avoid root-level pollution:
- `gamification.totalXp` (Number, default `0`): Aggregated gamification experience points.
- `gamification.maintenanceStreak` (Number, default `0`): Current consecutive days maintained *any* asset.
- `gamification.lastMaintenanceDate` (Date, null): Tracks the last time the global streak counted.
- `gamification.badges` (Array of Strings): Enum values inside the nested gamification sub-document tracking discrete unlocks like `['FIRST_CLEAN', '7_DAY_STREAK', 'PRISTINE_COLLECTION']`.

### Asset Collection (`server/src/models/Asset.js`)
Incorporate new fields under existing objects or standard conventions. Active gate requires checking `status === 'active'` (preserving `partial`/`failed` etc in the existing enum without modifying it).
- `condition.health` (Number, default `100`, min `0`, max `100`): Gamification health state.
- `condition.lastDecayDate` (Date, null): When the decay cron last hit this item.
- `condition.lastMaintenanceDate` (Date, null): Enforces local asset rate-limits (once-per-day cooldown).
- `condition.maintenanceCount` (Number, default `0`): Running tally of cleans.
- `visualLayers` (Array of Strings): Explicitly maps derived rendering parameters. Values include: `['dust_light', 'dust_medium', 'dust_heavy', 'yellowing']`. ('yellowing' is treated as an explicit composite element added alongside 'dust_heavy' when health drops below 20. It must be explicitly stripped if maintenance pushes health >= 20).
- `maintenanceLogs` (Array of sub-documents, Capped): Embedded array using `$push` with `$slice: -50` rule to prevent document bloat hitting 16MB MongoDB limits.
  - `date` (Date)
  - `healthRestored` (Number)
  - `xpAwarded` (Number)
- `version` (Number, default `1`): Distinct numeric ticker incremented on every maintain action, strictly leveraged for optimistic parallel lock-checking.

## Algorithms & State Transitions

### Daily Decay Formula (Cron Job)
- Execute at `00:00 UTC`.
- Match condition: `{ status: 'active' }`.
- Read existing `category` string to determine multiplier. (`sneaker: 1.5x`, `lego: 0.8x`, `camera: 1.2x`, `other: 1.0x`)
- New `condition.health` = `Math.max(0, current - (2 * category_modifier))`.
- Update `condition.lastDecayDate` = `now`.
- Determine `visualLayers`:
  - `[80-100]`: `[]`
  - `[60-79]`: `['dust_light']`
  - `[40-59]`: `['dust_medium']`
  - `[20-39]`: `['dust_heavy']`
  - `[0-19]`: `['dust_heavy', 'yellowing']`
- Persist new `condition.health`, `condition.lastDecayDate`, and computed `visualLayers` back to the Mongo Document using bulk operations.

### Maintenance Formula (API)
- Validations:
  - `status === 'active'` (throws `404`)
  - `condition.health` < 80 (throws `400`)
  - `condition.lastMaintenanceDate` not today (throws `429`)
  - Payload `version` matches Document `version` (throws `409`)
- Logic:
  - Base Restore = `25`. Streak Bonus = up to 15% (3 max increments of 5).
  - Compute new `condition.health` (Max 100).
  - Recalculate `visualLayers`. If new health >= 20, explicitly drop `yellowing`. If new health >= 80, explicitly clear all dust arrays.
  - Add to `gamification.totalXp` (+10 Fixed).
  - Push log to `maintenanceLogs` preserving strictly max 50 items.
  - Recalculate global `gamification.maintenanceStreak`.
  - Check Badge arrays logic.
  - Persist ALL modifications (`condition` block, `visualLayers`, `user.gamification` block, incremented `version`).