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
- Initialize missing `UserSubscription` rows for legacy users with a one-time Free-tier backfill before enabling enforcement.
- Gate hard enforcement behind `SUBSCRIPTION_ENFORCEMENT_ENABLED` and `SUBSCRIPTION_SOFT_LAUNCH_MODE` so rollout can surface counters before blocking.

## Rollout checklist

1. Run the legacy-user backfill from `server/src/modules/subscription/subscription.migration.js`.
2. Deploy with `SUBSCRIPTION_SOFT_LAUNCH_MODE=true` and confirm counters/reset dates render on web and mobile.
3. Review quota blocked/reserved/released audit behavior during pilot traffic.
4. Flip `SUBSCRIPTION_ENFORCEMENT_ENABLED=true` with `SUBSCRIPTION_SOFT_LAUNCH_MODE=false` after pilot sign-off.
