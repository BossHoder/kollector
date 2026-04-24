# Research: Manual Image Enhancement and Theme Presets

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-03-24

## Decision 1: Enhancement trigger contract

- Decision: Use `POST /api/assets/:id/enhance-image` as the only manual enhancement trigger and return HTTP 202 when accepted.
- Rationale: Matches locked product/API contract and preserves async architecture.
- Alternatives considered: Reusing `PATCH /api/assets/:id` for trigger side effects (rejected: weak API semantics and harder idempotency control).

## Decision 2: Duplicate trigger behavior

- Decision: Reject duplicate triggers while an enhancement job is queued/running and return HTTP 409 Conflict.
- Rationale: Prevents queue amplification and stale output races.
- Alternatives considered: Queue all duplicates (rejected: unnecessary cost and nondeterministic latest-result behavior).

## Decision 3: Retry strategy

- Decision: Retry transient enhancement failures up to 3 attempts with backoff, then mark enhancement as failed.
- Rationale: Balances resilience and bounded processing latency.
- Alternatives considered: Infinite retries (rejected: unbounded resource consumption and operational opacity).

## Decision 4: Queue boundary

- Decision: Use a dedicated BullMQ queue named `asset-enhancement`; do not use `ai-processing`.
- Rationale: Isolates workloads, metrics, and failure domains; aligns with constitution async boundary principle.
- Alternatives considered: Shared queue with AI jobs (rejected: contention and mixed retry/SLA profiles).

## Decision 5: Processing technique

- Decision: Use classical image processing only: Lanczos resize, unsharp masking, and heuristic crop tuning in Python with Pillow + NumPy.
- Rationale: Explicitly satisfies v1 non-AI enhancement requirement while improving detail visibility.
- Alternatives considered: AI super-resolution (rejected: out of v1 scope and violates locked constraint).

## Decision 6: Image storage and render semantics

- Decision: Preserve `images.original`; add `images.enhanced` for detail priority, keep `images.thumbnail` semantics unchanged for list/card.
- Rationale: Maintains backward compatibility while adding detail-quality path.
- Alternatives considered: Overwrite `images.processed` with enhancement output (rejected: breaks AI-pipeline semantics and existing consumers).

## Decision 7: Theme write surfaces and validation

- Decision: Keep existing write surfaces only: `PATCH /api/assets/:id` (`presentation.themeOverrideId`) and `PATCH /api/auth/me` (`settings.preferences.assetTheme.defaultThemeId`), reject unknown preset IDs.
- Rationale: Honors locked API constraints and keeps theme integrity deterministic.
- Alternatives considered: New theme-specific routes or silent fallback for unknown presets (rejected: contract drift and hidden data errors).

## Decision 8: Status visibility model

- Decision: Persist enhancement status/outcome on asset reads; emit `asset_image_enhanced` as additive Socket.io event.
- Rationale: API-first reliability for mobile/web clients independent of socket delivery.
- Alternatives considered: Socket-only status model (rejected: missed-event fragility and poor recoverability).

## Decision 9: Event compatibility strategy

- Decision: Preserve existing `asset_processed` event unchanged for AI pipeline and add new `asset_image_enhanced` event for manual enhancement.
- Rationale: Protects existing subscribers while enabling explicit new behavior.
- Alternatives considered: Reusing `asset_processed` for enhancement completion (rejected: source ambiguity and migration risk).

## Decision 10: Contract versioning

- Decision: Treat this feature as additive MINOR contract evolution with optional fields and no removals.
- Rationale: Constitution requires semver discipline and migration safety for public contracts, including explicit registry/version metadata updates and migration notes for 1.1.0 additive changes.
- Alternatives considered: In-place breaking field rewrites (rejected: violates backward compatibility requirement).
