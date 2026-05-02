# Subscription MVP Banking Evidence Index

## Success Criteria Mapping

| Success Criterion | Evidence Source | Status | Notes |
|---|---|---|---|
| SC-001 | `server/tests/contract/assets/asset-limit.contract.test.js`, `server/tests/contract/assets/analyze-queue-quota.contract.test.js`, `server/tests/contract/assets/enhance-image-quota.contract.test.js` | Partial | Test files added; runtime execution blocked locally by unavailable MongoDB. |
| SC-002 | `server/tests/integration/subscription/duplicate-blocked-no-charge.integration.test.js`, `server/tests/integration/subscription/processing-quota-accounting.integration.test.js` | Partial | Coverage present in code; not re-executed in this sandbox. |
| SC-003 | `server/tests/integration/subscription/upgrade-activation.integration.test.js` | Partial | Activation test exists; live DB run blocked locally. |
| SC-004 | `server/tests/integration/subscription/downgrade-no-data-deletion.integration.test.js`, `server/tests/integration/subscription/downgrade-block-new-actions.integration.test.js` | Partial | Downgrade safety coverage added. |
| SC-005 | `web/src/pages/app/SettingsPage.tsx`, `mobile/src/screens/settings/SettingsScreen.js` | Partial | UI implemented; manual timing validation still required. |
| SC-006 | `server/tests/contract/assets/theme-tier-lock.contract.test.js`, `server/tests/integration/subscription/free-theme-entitlement.integration.test.js`, `server/tests/integration/subscription/vip-theme-entitlement.integration.test.js`, `server/tests/integration/subscription/theme-downgrade-visibility.integration.test.js` | Partial | Contract and integration coverage added. |
| SC-007 | `server/tests/unit/gamification/maintenance-exp-multiplier.test.js`, `server/tests/integration/gamification/vip-exp-multiplier.integration.test.js` | Partial | Unit test passed locally; integration run blocked locally. |
| SC-008 | `web/src/components/subscription/SubscriptionStateBadge.tsx`, `mobile/src/components/subscription/SubscriptionStateBadge.js`, `mobile/src/screens/settings/ThemeLockParity.test.tsx` | Partial | Parity surfaces added; mobile/web runner blocked by spawn restrictions. |
| SC-009 | `server/tests/contract/subscription/backward-compatibility.contract.test.js` | Partial | Additive compatibility contract added. |
| SC-010 | `server/tests/integration/subscription/retention-windows.integration.test.js`, `server/tests/integration/subscription/proof-retention.lifecycle.test.js` | Partial | Retention tests exist; runtime validation blocked locally. |

## Environment Notes

- `server` integration tests currently require a reachable MongoDB instance. In this sandbox, Atlas access was blocked and local MongoDB was not running.
- `web` and `mobile` test runners hit Windows `spawn EPERM` in this environment before executing the new tests.
- `server/tests/unit/gamification/maintenance-exp-multiplier.test.js` passed locally.
- Server module load verification passed for subscription/gamification/maintenance modules.
