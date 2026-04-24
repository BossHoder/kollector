# Implementation Plan: Subscription MVP Banking

**Branch**: `001-subscription-mvp-banking` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-subscription-mvp-banking/spec.md`

## Summary

Implement MVP monetization with Free and VIP tiers using manual bank transfer confirmation, additive contracts, and fairness-first quota enforcement.

Technical approach:
- Add a subscription domain to persist tier, expiry, grace window, payment channel, and audit history.
- Add monthly combined processing quota accounting for analyze queue and enhancement triggers with reservation-on-accept and exact-once refund on terminal internal/system failure.
- Enforce asset-cap limits at asset creation paths and processing quota limits at analyze/enhance entry points without blocking read access to existing user data.
- Add manual bank-transfer workflow (submit request, admin review, approve/reject, activate/renew VIP) with proof retention windows (file 30 days, metadata 180 days).
- Keep existing realtime and API contracts backward compatible by adding optional fields and additive error/event payloads.
- Keep web/mobile UX states aligned for near-limit, at-limit, upgraded, downgraded, renewal-pending, and expired.

## Technical Context

**Language/Version**: Node.js (server), TypeScript/JavaScript (web + mobile), React Native Expo for mobile  
**Primary Dependencies**: Express, Mongoose, BullMQ, Redis (ioredis), Socket.io, express-validator, React Query/TanStack, Expo  
**Storage**: MongoDB (subscriptions, quota counters, audit logs), Redis (queue state), secure object storage for transfer proof files (30-day retention)  
**Testing**: Jest (server unit/contract/integration), Vitest (web), Jest Expo (mobile), schema/contract validation tests  
**Target Platform**: Linux server containers, modern browsers (web), iOS 15+ and Android 10+ (mobile)  
**Project Type**: Monorepo (server + web + mobile + ai-worker)  
**Performance Goals**:
- Admin-approved VIP activation visible to clients within 60 seconds
- Quota/tier checks add minimal request overhead (target <=100ms p95 at entry points)
- Quota status and reset-date UI loads with each authenticated profile/subscription fetch
- Preserve existing analyze/enhance throughput while adding quota accounting
**Constraints**:
- Asset cap applies to assets only (not collections) with limits 20 Free / 200 VIP
- Processing cap is monthly combined count 20 Free / 400 VIP
- Free themes are exactly two presets (default + one light preset)
- VIP is priced at USD 0.99/month for MVP
- Renewal grace is 72 hours only when renewal was submitted before expiry and is pending admin confirmation
- Contract changes must be additive and backward compatible
- Read access to existing data cannot be blocked by quota exhaustion
**Scale/Scope**:
- Two subscription tiers, one payment channel (manual banking) for MVP
- Three existing enforcement surfaces: asset creation, analyze queue, enhancement trigger
- Cross-client consistency across server/web/mobile for quota messaging and tier states

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate Review

1. Modular Monolith Discipline: PASS
- Work remains in existing server modules (`auth`, `assets`, queue workers) plus additive subscription domain module; no microservice split.

2. Async Queue Boundaries: PASS
- Analyze and enhancement remain asynchronous via BullMQ; quota checks occur at entry/acceptance boundaries only.

3. Test-First (NON-NEGOTIABLE): PASS (planned)
- Plan defines tests first for quota reservation/refund, tier transitions, banking approvals, downgrade behavior, and web/mobile consistency contracts.

4. Data Schema Fidelity: PASS
- Additive schemas only: subscription, usage counters, upgrade request metadata, and audit entities; no undeclared fields.

5. Observability, Versioning and Simplicity: PASS
- Additive semver MINOR contracts; explicit error codes for quota and tier locks; audit logs include actor/reason/timestamps.

6. FE UI Fidelity (Stitch Prototypes): PASS
- Changes are state/entitlement overlays in existing flows; no screen redesign proposed.

7. Contract-First FE Integration: PASS
- OpenAPI contracts define new endpoints and additive responses on existing endpoints before implementation.

### Post-Design Gate Review

1. Tests-first coverage for all mandatory acceptance classes: PASS
2. Queue-boundary compliance preserved for heavy operations: PASS
3. Additive schema and contract evolution only: PASS
4. Backward compatibility for existing events/flows retained: PASS
5. Cross-platform quota state consistency represented in contracts/quickstart: PASS

## Project Structure

### Documentation (this feature)

```text
specs/001-subscription-mvp-banking/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- subscription-mvp.openapi.json
|   |-- subscription-events.schema.json
|   `-- migration-notes-1.2.0.md
`-- tasks.md
```

### Source Code (repository root)

```text
server/
|-- src/
|   |-- app.js
|   |-- models/
|   |-- modules/
|   |-- middleware/
|   |-- workers/
|   `-- contracts/
`-- tests/
    |-- contract/
    |-- integration/
    `-- unit/

web/
|-- src/
|   |-- components/
|   |-- contexts/
|   |-- hooks/
|   |-- pages/
|   `-- types/
`-- tests/

mobile/
|-- src/
|   |-- api/
|   |-- contexts/
|   |-- hooks/
|   |-- navigation/
|   |-- screens/
|   `-- services/
`-- __mocks__/
```

**Structure Decision**:
Use the existing monorepo and extend current server/web/mobile layers in-place with additive subscription and quota capabilities. No new top-level project or service is introduced.

## Complexity Tracking

No constitution violations requiring justification.
