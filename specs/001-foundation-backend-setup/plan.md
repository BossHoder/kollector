# Implementation Plan: Foundation Backend Setup

**Branch**: `001-foundation-backend-setup` | **Date**: 2025-12-17 | **Spec**: `specs/001-foundation-backend-setup/spec.md`
**Input**: Feature specification from `specs/001-foundation-backend-setup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the backend foundation for KLECTR in the existing Node.js modular monolith: connect MongoDB via Mongoose, define `User` and `Asset` schemas exactly as in the MASTER_PLAN, and expose Auth (register/login + JWT with refresh) and Asset (owner-scoped CRUD + cursor-based listing) HTTP APIs behind `auth.middleware.js`.

## Technical Context

**Language/Version**: Node.js 20 LTS (CommonJS, Express 5)
**Primary Dependencies**: Express 5, Mongoose 9, BullMQ 5, ioredis 5, Socket.io 4, `jsonwebtoken`, `argon2` for password hashing
**Storage**: MongoDB (via Mongoose), connection string from environment; no additional datastores introduced in this phase
**Testing**: Jest + supertest for HTTP contract tests; Jest with a dedicated test MongoDB database (separate DB name) for model/service unit tests
**Target Platform**: Node.js server running in Docker on Linux; consumed by React Native (mobile) and Vite React (web)
**Project Type**: Monorepo with mobile, web, and backend; this feature targets the `server` backend (modular monolith modules for auth and assets)
**Performance Goals**: Login completes < 2s; asset CRUD < 1s end-to-end under normal load; Mongo connection established on startup without blocking requests for more than a few seconds on transient issues
**Constraints**: Must follow KLECTR Constitution (modular monolith, queue-first for heavy work, schema fidelity, TDD); no synchronous AI/image processing in HTTP handlers; JWT-based auth with 15m access and 7d refresh
**Scale/Scope**: Foundation phase for early users (<10k active); single region, single Mongo cluster; no horizontal sharding decisions required in this phase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following gates derive from the KLECTR Constitution and how this feature will comply:

- **Modular Monolith**: Implementation will live in the existing `server` app as modules (e.g., `modules/auth`, `modules/assets`) with clear separation between controllers, services, and models. No new microservices will be introduced; all work remains inside the monolith.
- **Queue-First**: This foundation phase implements only synchronous CRUD and auth. No AI, image processing, or other heavy work is invoked from HTTP handlers; queue integration (BullMQ) remains reserved for later phases, keeping this phase compliant with the async boundary rule.
- **Test-First**: Plan and subsequent tasks will define Jest-based unit tests for models/services and contract tests for HTTP endpoints before implementation. The `tasks.md` for this feature will gate work on having failing tests first (RED → GREEN → REFACTOR).
- **Schema Fidelity**: `User` and `Asset` Mongoose models will be defined exactly as in the MASTER_PLAN and used as the single source of truth. Request/response DTOs for auth and asset endpoints will be validated against these schemas; no extra fields will be persisted or returned.
- **Observability & Events**: This phase will introduce structured logging (with request IDs) for auth and asset endpoints. Socket.io realtime events for asset lifecycle are not required in this foundation phase but event names and placeholders will be documented to stay compatible with later realtime phases.

**Gate Status (Post-Design)**: PASS — Design keeps all work inside the modular monolith, avoids synchronous AI/image processing, defines clear Mongoose schemas aligned with the MASTER_PLAN, and plans Test-First development with contract/unit tests. No deviations require entries in "Complexity Tracking" for this phase.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── app.js
│   ├── config/
│   ├── models/
│   │   ├── Asset.js
│   │   └── User.js
│   ├── modules/
│   │   ├── auth/          # New: auth controllers/services/routes for register/login/refresh
│   │   └── assets/        # New: asset controllers/services/routes for CRUD + listing
│   └── workers/
└── tests/
    ├── unit/
    ├── contract/
    └── integration/

ai-worker/
├── Dockerfile
└── main.py

web/
└── src/ ... (no changes in this phase)

mobile/
└── src/ ... (no changes in this phase)
```

**Structure Decision**: Use the existing `server` Node.js app as the modular monolith backend. Introduce feature-focused modules `modules/auth` and `modules/assets`, keep shared Mongoose models in `src/models`, and add dedicated `tests/unit`, `tests/contract`, and `tests/integration` trees for Test-First development.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
