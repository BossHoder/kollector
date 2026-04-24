# Contract Migration Notes: 1.2.0

## Version

- Previous: 1.1.0
- New: 1.2.0 (additive MINOR)

## Additive changes

- New subscription endpoints for current entitlement and manual bank-transfer request lifecycle.
- New admin review endpoints for upgrade/renewal approval and rejection.
- Additive quota/tier-limit error responses on existing asset create, analyze queue, and enhancement trigger endpoints.
- Additive tier-lock errors for premium-only theme apply attempts.
- Additive subscription event schemas for tier changes and quota usage updates.

## Backward compatibility

- Existing success payloads remain valid.
- Existing realtime/event flows (`asset_processed`) remain unchanged.
- Existing enhancement and theme APIs remain available; only additive entitlement checks/errors are introduced.

## Required client updates

- Handle quota and tier-lock error codes with upgrade/reset messaging.
- Read and display `usage` + `nextResetAt` from subscription status endpoint.
- Update entitlement UI for near-limit, at-limit, upgraded, downgraded, renewal-pending, and expired states.

## Operational rollout safeguards

- Support soft-launch mode where counters and warnings are visible before hard blocking.
- Monitor quota refund behavior for terminal internal/system failures to ensure exact-once releases.
- Verify proof-file purge at 30 days and metadata retention at 180 days.
