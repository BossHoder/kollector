# Implementation Plan: Gamification Core

**Branch**: `013-gamification-core` | **Date**: March 22, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Re-mapping against Plan.docx limits and existing brownfield schema nested paths.

## Summary
Implement core Gamification loops for active assets (daily visual decay) and mobile interaction (2-sec back-and-forth rubbing gesture) utilizing offline-capable fire-and-forget queues. It tracks gamification strictly within normalized `condition` and `gamification` Mongoose sub-documents enforcing strict API constraints.

## Technical Context

**Language/Version**: Node.js, React Native (Expo)
**Primary Dependencies**: `@shopify/react-native-skia`, `react-native-gesture-handler`, `TanStack Query`, `Mongoose`
**Storage**: MongoDB (extending `Asset.js` and `User.js`), `react-native-mmkv`
**Target Platform**: Node.js Server & React Native Mobile App
**Project Type**: mobile + api
**Performance Goals**: Maximize decay throughput to process subset within 5 minutes without lock contention. Decay operates in a separate cron worker process via MongoDB bulkWrite, which does not block HTTP request handlers, thereby satisfying the modular monolith rules without strictly requiring Redis/BullMQ.

## Constitution Check
- [x] **I. Modular Monolith**: Routes adhere to `server/src/modules/` boundaries. Model logic extended via domain services. Cron workers operate securely away from HTTP loops.
- [x] **III. Test-First**: Contract testing enforces new explicit HTTP Error permutations. FE offline and queue mechanisms tested via explicit tasks BEFORE client code is written.
- [x] **IV. Data Schema Fidelity**: Nested schema updates only (`condition`, `gamification`). `maintenanceLogs` capped to 50 via array updates rather than separate collection per architecture decision.
- [x] **VII. Contract-First**: Enforced OpenAPI validation using exact keys mapped to Plan.docx.
- [x] **MVP Scope Clarification**: While earlier iterations deferred gamification, `013-gamification-core` is introduced here strictly as a valid follow-on brownfield feature expanding existing MVP endpoints.

## Project Structure

### Documentation
```text
specs/013-gamification-core/
├── plan.md              # Target Implementation paths
├── research.md          # Gesture algorithms (carried over)
├── data-model.md        # Nested object paths outlined
├── quickstart.md        # Cron hooks
├── contracts/
│   └── gamification.openapi.json
└── tasks.md             # Sub-agent executable tasks
```

### Source Code
```text
server/
├── src/
│   ├── models/
│   │   ├── Asset.js     (Extends condition sub-doc)
│   │   └── User.js      (Extends gamification sub-doc)
│   ├── modules/
│   │   ├── gamification/
│   │   │   └── gamification.service.js
│   │   └── assets/
│   │       ├── assets.routes.js (Mounts POST /:assetId/maintain)
│   │       └── assets.controller.js
│   └── workers/
│       └── cron.decay.js
└── tests/
    └── contract/
        └── assets.maintain.test.js

mobile/
└── src/
    ├── api/
    │   └── gamification.ts
    ├── components/
    │   └── AssetMaintenanceRubMask.tsx
    ├── screens/
    │   └── AssetDetailScreen.tsx
    └── utils/
        └── offlineQueue.ts
```

**Structure Decision**: Extending the existing architecture without namespace clashes. The endpoint will explicitly bind to the existing `assets.routes.js` to inherit `auth.middleware.js` context, piping the business logic to a dedicated `gamification.service.js`.