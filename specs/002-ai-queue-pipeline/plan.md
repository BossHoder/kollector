# Implementation Plan: AI Queue Pipeline

**Branch**: `002-ai-queue-pipeline` | **Date**: 2025-12-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-ai-queue-pipeline/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build the backend AI processing engine that handles asynchronous image analysis. The system:
1. Provides a `POST /api/assets/analyze-queue` endpoint that accepts multipart image uploads, creates draft assets, and enqueues BullMQ jobs
2. Runs a background worker (`ai.worker.js`) that processes jobs from the `ai-processing` queue, calls the Python AI service, and updates asset records
3. Integrates Socket.io to emit `asset_processed` events to per-user rooms when jobs complete (success or failure)
4. Supports retry with exponential backoff and dead-letter queue for failed jobs

## Technical Context

**Language/Version**: Node.js 20.x (Express 5.x backend), JavaScript/CommonJS  
**Primary Dependencies**: BullMQ 5.x, ioredis 5.x, Socket.io 4.x, Multer (file uploads), Mongoose 9.x  
**Storage**: MongoDB (via Mongoose), Redis (via Upstash for BullMQ queues)  
**Testing**: Jest 30.x, Supertest 7.x (contract tests), integration tests with Redis/MongoDB  
**Target Platform**: Linux server (Docker), Node.js runtime  
**Project Type**: web (backend API + mobile clients)  
**Performance Goals**: Job submission confirmation <2s, 95% jobs processed <60s, event delivery <1s post-completion  
**Constraints**: 100 concurrent jobs without loss, 3 retries with exponential backoff, per-user event isolation  
**Scale/Scope**: Single modular monolith instance, queue-based scaling for workers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following gates derive from the KLECTR Constitution:

| Gate | Status | Notes |
|------|--------|-------|
| **Modular Monolith** | ✅ PASS | New files in existing module boundaries: `modules/assets/`, `workers/`, `config/`. No microservices. |
| **Queue-First** | ✅ PASS | AI processing via BullMQ queue (`ai-processing`). HTTP handler only enqueues; no sync AI calls. |
| **Test-First** | ✅ PASS | Contract tests for POST endpoint, queue job payloads, Socket.io events. Integration tests for worker flow. |
| **Schema Fidelity** | ✅ PASS | Asset model already has `processingJobId`, `status`, `aiMetadata` fields. No schema changes needed. |
| **Observability & Events** | ✅ PASS | Structured logging with jobId/assetId. Socket.io `asset_processed` event emission included. |

## Project Structure

### Documentation (this feature)

```text
specs/002-ai-queue-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI, JSON schemas)
│   ├── analyze-queue.openapi.json
│   ├── ai-job.schema.json
│   └── asset-processed-event.schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
server/
├── src/
│   ├── app.js                          # Express app (add Socket.io init)
│   ├── config/
│   │   ├── database.js                 # Existing MongoDB config
│   │   ├── logger.js                   # Existing Winston logger
│   │   ├── redis.js                    # NEW: Redis/ioredis connection
│   │   └── socket.js                   # NEW: Socket.io server setup
│   ├── middleware/
│   │   ├── auth.middleware.js          # Existing JWT auth
│   │   ├── upload.middleware.js        # NEW: Multer multipart config
│   │   └── ...
│   ├── models/
│   │   └── Asset.js                    # Existing (add 'failed' status)
│   ├── modules/
│   │   └── assets/
│   │       ├── assets.controller.js    # Extend with analyzeQueue
│   │       ├── assets.routes.js        # Add POST /analyze-queue
│   │       ├── assets.service.js       # Extend with queue methods
│   │       └── assets.queue.js         # NEW: BullMQ queue setup
│   └── workers/
│       └── ai.worker.js                # NEW: BullMQ worker
└── tests/
    ├── contract/
    │   └── assets/
    │       └── analyze-queue.test.js   # NEW: API contract tests
    ├── integration/
    │   └── ai-pipeline.test.js         # NEW: End-to-end worker test
    └── unit/
        └── assets/
            └── queue.test.js           # NEW: Queue service unit tests
```

**Structure Decision**: Extends existing modular monolith structure. New queue infrastructure in `config/`, worker in `workers/`, queue logic in `modules/assets/`. Tests follow existing pattern in `tests/contract/` and `tests/integration/`.

## Complexity Tracking

> No Constitution violations. All gates pass. No complexity justification needed.
