# Research: Subscription MVP Banking

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-04-07

## Decision 1: Asset-cap scope

- Decision: Apply 20/200 caps to assets only, not collections.
- Rationale: Existing product flows and schema are asset-centric; this avoids unnecessary collection-model migration risk.
- Alternatives considered: Combined collection+asset cap (rejected: ambiguous counting and higher UX confusion).

## Decision 2: Processing quota accounting model

- Decision: Reserve one usage unit when analyze/enhance request is accepted; refund exactly once if processing ends in terminal internal/system failure.
- Rationale: Prevents abuse via unlimited accepted retries while preserving fairness for system-caused failures.
- Alternatives considered: Charge only on success (rejected: vulnerable to retry abuse); charge and never refund (rejected: user-backlash risk).

## Decision 3: Monthly reset mechanics

- Decision: Use UTC calendar month windows with lazy rollover on first request after boundary if scheduled reset is delayed.
- Rationale: Deterministic and globally consistent across web/mobile/server.
- Alternatives considered: User-local timezone reset (rejected: inconsistent cross-platform behavior and support complexity).

## Decision 4: Renewal grace behavior

- Decision: Grant a 72-hour grace window only when a renewal request was submitted before VIP expiry and is still pending review.
- Rationale: Protects users from review delay without creating open-ended entitlement drift.
- Alternatives considered: No grace (rejected: operationally harsh for manual-transfer workflow); 7-day grace (rejected: longer revenue leakage window).

## Decision 5: Manual banking request lifecycle

- Decision: Use explicit statuses `pending`, `approved`, `rejected`, `expired` with request type `upgrade` or `renewal`.
- Rationale: Clear admin workflow and auditable transitions.
- Alternatives considered: Single loosely-typed request state (rejected: poor dispute traceability).

## Decision 6: Proof retention policy

- Decision: Retain proof files for 30 days and transfer metadata for 180 days.
- Rationale: Balances privacy/security with support and dispute investigation needs.
- Alternatives considered: Long proof retention (rejected: higher sensitive-data exposure); metadata-only (rejected: weak early dispute evidence).

## Decision 7: Free theme entitlement

- Decision: Free tier allows exactly two selectable presets: default + one light preset; all others VIP-locked.
- Rationale: Matches clarified product decision and keeps lock behavior deterministic.
- Alternatives considered: Three free presets (rejected: contradicts final clarification).

## Decision 8: Error contract for quota and tier lock

- Decision: Use standard error envelope with machine-readable codes and `details` containing tier, limitType, used, limit, and resetDate.
- Rationale: Enables consistent client handling on web/mobile and clear user messaging.
- Alternatives considered: Endpoint-specific ad hoc error shapes (rejected: inconsistent client behavior).

## Decision 9: Audit model

- Decision: Keep separate immutable logs for tier changes and quota accounting updates.
- Rationale: Distinct domains simplify compliance reviews and support for billing vs quota disputes.
- Alternatives considered: Single mixed audit stream (rejected: harder queryability and attribution).

## Decision 10: Future store-billing readiness

- Decision: Store `paymentChannel` as extensible enum (`manual_bank` active; `google_play` and `app_store` reserved) with external reference fields optional.
- Rationale: Future integration-ready without breaking MVP contract.
- Alternatives considered: Manual-bank hardcoded channel string without enum (rejected: migration friction for app store rollout).

## Decision 11: Backward compatibility strategy

- Decision: Keep existing asset/analyze/enhance flows intact; add only optional subscription/quota fields and additive error/event payloads.
- Rationale: Required by spec and constitution contract-first principles.
- Alternatives considered: Reworking existing response models (rejected: high regression risk).

## Decision 12: Contract versioning

- Decision: Publish this feature as semver MINOR additive contract update (1.2.0) with migration notes.
- Rationale: New endpoints and additive responses/events without breaking existing consumers.
- Alternatives considered: Patch version (rejected: understates functional contract expansion).
