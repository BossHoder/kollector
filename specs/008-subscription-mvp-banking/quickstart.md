# Quickstart: Subscription MVP Banking

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Contracts**: [contracts/subscription-mvp.openapi.json](contracts/subscription-mvp.openapi.json)

## 1. Prerequisites

- MongoDB and Redis running for server + queue workflows.
- Environment variables configured for server, including JWT/auth and storage for transfer proof files.
- Node dependencies installed in `server/`, `web/`, and `mobile/`.

## 2. Run the stack

1. Start backend API:
```bash
cd server
npm run dev
```
2. Start web app:
```bash
cd web
npm run dev
```
3. Start mobile app:
```bash
cd mobile
npm run start
```

## 3. Core validation flow

### A. Free asset-cap enforcement

1. Authenticate as Free user.
2. Create assets until total reaches 20.
3. Attempt asset #21.
4. Verify:
- Create action is blocked with asset-cap error details.
- Existing assets remain fully readable.

### B. Monthly processing quota and refund fairness

1. As Free user, trigger analyze/enhance actions until 20 accepted uses.
2. Verify next processing request is blocked with reset date.
3. Force one accepted request into terminal internal/system failure.
4. Verify reserved usage is released exactly once and quota totals update correctly.

### C. Manual banking upgrade

1. Submit upgrade request with transfer reference and proof file.
2. Approve request via admin endpoint.
3. Verify within 60 seconds:
- Tier becomes VIP.
- Asset cap becomes 200.
- Processing quota becomes 400.
- EXP multiplier becomes 3x.

### D. Renewal grace behavior

1. Set VIP subscription near expiry with renewal request pending before expiry.
2. Advance time past expiry.
3. Verify VIP remains active during 72-hour grace.
4. If not approved by grace end, verify automatic downgrade to Free without data deletion.

### E. Theme entitlement behavior

1. As Free user, open theme controls in web and mobile.
2. Verify exactly two selectable presets (default + light); others are locked.
3. As VIP user, verify all presets selectable.
4. Downgrade VIP and verify previously applied VIP themes remain readable, but new VIP-only applies are blocked.

## 4. Contract and event checks

- Validate API responses against [contracts/subscription-mvp.openapi.json](contracts/subscription-mvp.openapi.json).
- Validate tier and quota events against [contracts/subscription-events.schema.json](contracts/subscription-events.schema.json).
- Confirm existing `asset_processed` and enhancement flows remain backward compatible.

## 5. Test commands

1. Server tests:
```bash
cd server
npm test
```
2. Web tests:
```bash
cd web
npm run test:run
```
3. Mobile tests:
```bash
cd mobile
npm test
```

## 6. Minimum regression checklist

- Quota reached (asset + processing)
- Upgrade approved
- Renewal pending grace
- Grace elapsed downgrade
- Duplicate blocked request handling
- Internal/system failure refund accounting
- Monthly reset rollover
- Web/mobile quota state consistency
- Existing enhancement/theme/realtime compatibility

## 7. Validation evidence

- Local unit validation completed: `server/tests/unit/gamification/maintenance-exp-multiplier.test.js`
- Server integration validation was blocked in this environment because MongoDB was unreachable.
- Web and mobile automated validation were blocked in this environment by Windows `spawn EPERM` from the test runners.
- See `specs/008-subscription-mvp-banking/evidence/README.md` for success-criteria mapping and remaining manual validation gaps.
