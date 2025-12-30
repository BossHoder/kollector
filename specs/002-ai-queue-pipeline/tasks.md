# Tasks: AI Queue Pipeline

**Input**: Design documents from `/specs/002-ai-queue-pipeline/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Tests are MANDATORY per Constitution principle III (Test-First).
Write tests FIRST; they MUST fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `server/src/`, `server/tests/`
- Paths based on plan.md project structure

## Contract References (SOURCE OF TRUTH)

- **API**: `contracts/analyze-queue.openapi.json` — POST /api/assets/analyze-queue
- **Job Payload**: `contracts/ai-job.schema.json` — BullMQ job.data shape
- **Socket Event**: `contracts/asset-processed-event.schema.json` — asset_processed payload

## Queue Configuration (from research.md)

- Queue name: `ai-processing`
- Job timeout: 120s
- Retry: 3 attempts, exponential backoff, delay 2000ms
- Retention: removeOnComplete 24h, removeOnFail 7d
- Concurrency: 5 jobs per worker

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create base configuration files

- [x] T001 Install new dependencies: `npm install multer cloudinary` in server/
- [x] T002 [P] Create Redis connection config with `maxRetriesPerRequest: null` in server/src/config/redis.js
- [x] T003 [P] Create Cloudinary upload helper in server/src/config/cloudinary.js
- [x] T004 [P] Create Multer upload middleware (memoryStorage, 10MB limit, image/* filter) in server/src/middleware/upload.middleware.js
- [x] T005 Add 'failed' to Asset status enum in server/src/models/Asset.js (enum: draft/processing/partial/active/archived/failed)
- [x] T006 [P] Add environment variables to server/.env.example (REDIS_URL, AI_SERVICE_URL, CLOUDINARY_URL)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create BullMQ queue setup in server/src/modules/assets/assets.queue.js with exact config: attempts=3, backoff={type:'exponential',delay:2000}, removeOnComplete={age:86400}, removeOnFail={age:604800}
- [x] T008 Create Socket.io server setup in server/src/config/socket.js (attach to HTTP server, CORS config)
- [x] T009 Implement Socket.io JWT auth middleware in server/src/config/socket.js: verify auth.token from handshake, extract userId from JWT payload (sub field)
- [x] T010 Implement room join on connection: socket.join(`user:${socket.userId}`) in server/src/config/socket.js
- [x] T011 Export getIO() singleton function from server/src/config/socket.js for worker access
- [x] T012 Integrate Socket.io with Express app in server/src/app.js (create HTTP server, attach io)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Submit Asset for AI Processing (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can upload image + category via multipart/form-data, system creates asset and enqueues job

**Independent Test**: Submit multipart request → verify asset created with status "processing" and job in queue

**Contract**: Response MUST match `contracts/analyze-queue.openapi.json` (202 structure, error shapes with code/message/details)

### Tests for User Story 1 (MANDATORY, write first) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Contract test: POST /api/assets/analyze-queue success returns 202 with {success,data:{assetId,jobId,status,message}} in server/tests/contract/assets/analyze-queue.test.js
- [x] T014 [P] [US1] Contract test: Missing image file returns 400 with {success:false,error:{code:'VALIDATION_ERROR',message,details:[{field:'image'}]}} in server/tests/contract/assets/analyze-queue.test.js
- [x] T015 [P] [US1] Contract test: Invalid category returns 400 with {success:false,error:{code:'VALIDATION_ERROR',details:[{field:'category'}]}} in server/tests/contract/assets/analyze-queue.test.js
- [x] T016 [P] [US1] Contract test: File too large (>10MB) returns 400 with {success:false,error:{code:'VALIDATION_ERROR',details:[{field:'image',message:'Maximum file size is 10MB'}]}} in server/tests/contract/assets/analyze-queue.test.js
- [x] T017 [P] [US1] Contract test: Unauthenticated returns 401 with {success:false,error:{code:'UNAUTHORIZED'}} in server/tests/contract/assets/analyze-queue.test.js
- [x] T018 [P] [US1] Unit test: Queue addJob() creates job with payload matching ai-job.schema.json (required: assetId,userId,imageUrl,category,createdAt; no extra fields) in server/tests/unit/assets/queue.test.js
- [x] T019 [P] [US1] Unit test: Queue addJob() uses correct job options (attempts:3, backoff, timeout:120000) in server/tests/unit/assets/queue.test.js

### Implementation for User Story 1

- [x] T020 [US1] Add analyzeQueue route POST /analyze-queue with auth + upload middleware in server/src/modules/assets/assets.routes.js
- [x] T021 [US1] Implement analyzeQueue controller in server/src/modules/assets/assets.controller.js: validate request, call service, return 202 response per OpenAPI spec
- [x] T022 [US1] Implement uploadToCloudinary() in server/src/modules/assets/assets.service.js (upload buffer, return {url,publicId})
- [x] T023 [US1] Implement createAssetAndEnqueue() in server/src/modules/assets/assets.service.js: create Asset with status='processing', images.original.url, processingJobId; enqueue job
- [x] T024 [US1] Implement addToProcessingQueue() in server/src/modules/assets/assets.queue.js: build job data per ai-job.schema.json, add to queue with configured options
- [x] T025 [US1] Add request validation: require image file, validate category enum (sneaker/lego/camera/other)
- [x] T026 [US1] Add structured logging for job submission with requestId, assetId, jobId

**Checkpoint**: User Story 1 complete - users can submit assets for processing via API

---

## Phase 4: User Story 2 - Receive Real-Time Processing Updates (Priority: P1)

**Goal**: Connected clients receive `asset_processed` events when their assets complete processing

**Independent Test**: Connect Socket.io client with JWT → trigger event → verify client receives payload

**Contract**: Event payload MUST match `contracts/asset-processed-event.schema.json`

### Tests for User Story 2 (MANDATORY, write first) ⚠️

- [x] T027 [P] [US2] Integration test: Socket.io connection with valid JWT in auth.token succeeds in server/tests/integration/socket-auth.test.js
- [x] T028 [P] [US2] Integration test: Socket.io connection without auth.token fails with 'Authentication required' in server/tests/integration/socket-auth.test.js
- [x] T029 [P] [US2] Integration test: Socket.io connection with invalid JWT fails with 'Invalid token' in server/tests/integration/socket-auth.test.js
- [x] T030 [P] [US2] Integration test: Client joins correct room `user:<userId>` on connect in server/tests/integration/socket-auth.test.js
- [x] T031 [P] [US2] Unit test: emitAssetProcessed() success payload matches asset-processed-event.schema.json SuccessEvent (event='asset_processed',status='active',aiMetadata,processedImageUrl,timestamp) in server/tests/unit/assets/socket-events.test.js
- [x] T032 [P] [US2] Unit test: emitAssetProcessed() failure payload matches asset-processed-event.schema.json FailureEvent (event='asset_processed',status='failed',error,timestamp) in server/tests/unit/assets/socket-events.test.js
- [x] T033 [P] [US2] Integration test: Event emitted to room `user:<userId>` is received only by that user's sockets in server/tests/integration/socket-auth.test.js

### Implementation for User Story 2

- [x] T034 [US2] Create emitAssetProcessed() helper in server/src/modules/assets/assets.events.js
- [x] T035 [US2] Implement success event builder: {event:'asset_processed',assetId,status:'active',aiMetadata:{brand,model,colorway},processedImageUrl,timestamp} in assets.events.js
- [x] T036 [US2] Implement failure event builder: {event:'asset_processed',assetId,status:'failed',error,timestamp} in assets.events.js
- [x] T037 [US2] Emit to room `user:${userId}` using getIO().to(...).emit() in assets.events.js

**Checkpoint**: User Story 2 complete - clients can connect and will receive events (worker integration in US3)

---

## Phase 5: User Story 3 - Background Job Processing (Priority: P1)

**Goal**: Worker processes queued jobs, calls AI service (AI_SERVICE_URL/analyze), updates assets, emits events

**Independent Test**: Add job to queue → worker processes → asset updated to "active" → event emitted

**Contracts**: Job data per ai-job.schema.json, event per asset-processed-event.schema.json

### Tests for User Story 3 (MANDATORY, write first) ⚠️

- [x] T038 [P] [US3] Unit test: AI client callAnalyze(imageUrl,category) with 90s timeout in server/tests/unit/assets/ai-client.test.js
- [x] T039 [P] [US3] Unit test: AI client parses response {brand,model,colorway,processedImageUrl} correctly in server/tests/unit/assets/ai-client.test.js
- [x] T040 [P] [US3] Integration test: Worker processes job, updates asset status to 'active', sets aiMetadata fields in server/tests/integration/ai-pipeline.test.js
- [x] T041 [P] [US3] Integration test: Worker sets images.processed.url from AI response processedImageUrl in server/tests/integration/ai-pipeline.test.js
- [x] T042 [P] [US3] Integration test: Worker emits asset_processed success event with correct payload in server/tests/integration/ai-pipeline.test.js
- [x] T043 [P] [US3] Integration test: Worker retries on AI service 5xx error (verify 3 attempts with backoff) in server/tests/integration/ai-pipeline.test.js
- [x] T044 [P] [US3] Integration test: After max retries, asset status='failed', aiMetadata.error set, failure event emitted in server/tests/integration/ai-pipeline.test.js
- [x] T045 [P] [US3] Integration test: Worker handles deleted asset gracefully (job completes, no crash) in server/tests/integration/ai-pipeline.test.js

### Implementation for User Story 3

- [x] T046 [US3] Create AI service HTTP client in server/src/modules/assets/ai.client.js
- [x] T047 [US3] Implement callAnalyze(imageUrl,category) with 90s timeout, POST to ${AI_SERVICE_URL}/analyze in ai.client.js
- [x] T048 [US3] Parse AI response: extract brand/model/colorway (with confidence), processedImageUrl in ai.client.js
- [x] T049 [US3] Create BullMQ worker in server/src/workers/ai.worker.js with concurrency=5
- [x] T050 [US3] Implement job processor: extract job.data (assetId,userId,imageUrl,category), fetch Asset from DB in ai.worker.js
- [x] T051 [US3] Handle missing asset: log warning, return early (job completes successfully) in ai.worker.js
- [x] T052 [US3] Call AI client, update Asset: status='active', aiMetadata={brand,model,colorway,processedAt}, images.processed.url in ai.worker.js
- [x] T053 [US3] On success: call emitAssetProcessed() with success payload in ai.worker.js
- [x] T054 [US3] On failure (after all retries): update Asset status='failed', aiMetadata.error=message, call emitAssetProcessed() with failure payload in ai.worker.js
- [x] T055 [US3] Add structured logging: jobId, assetId, attempt number (job.attemptsMade), processing duration in ai.worker.js
- [x] T056 [US3] Start worker on app startup (import and initialize) in server/src/app.js

**Checkpoint**: User Story 3 complete - full pipeline works end-to-end

---

## Phase 6: User Story 4 - Monitor Queue Health (Priority: P3)

**Goal**: Developers/admins can query queue metrics for operational visibility

**Independent Test**: Call queue status endpoint → verify correct job counts returned

### Tests for User Story 4 (MANDATORY, write first) ⚠️

- [x] T057 [P] [US4] Contract test: GET /api/assets/queue-status returns {waiting,active,completed,failed} counts in server/tests/contract/assets/queue-status.test.js
- [x] T058 [P] [US4] Contract test: Unauthenticated returns 401 in server/tests/contract/assets/queue-status.test.js

### Implementation for User Story 4

- [x] T059 [US4] Add getQueueStatus route GET /queue-status with auth middleware in server/src/modules/assets/assets.routes.js
- [x] T060 [US4] Implement getQueueStatus controller in server/src/modules/assets/assets.controller.js
- [x] T061 [US4] Implement getQueueMetrics() in server/src/modules/assets/assets.queue.js using queue.getJobCounts()

**Checkpoint**: User Story 4 complete - queue monitoring available

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and production readiness

- [x] T062 [P] Add JSDoc comments to all new public functions (queue, events, ai.client, worker)
- [x] T063 [P] Update server/README.md with queue pipeline documentation (setup, env vars, endpoints)
- [x] T064 [P] Add graceful shutdown for worker in server/src/app.js (worker.close(), queue.close() on SIGTERM)
- [x] T065 [P] Add graceful shutdown for Socket.io in server/src/app.js (io.close() on SIGTERM)
- [x] T066 Verify all tests pass: `npm test` in server/
- [x] T067 Manual end-to-end test per quickstart.md instructions

---

## Dependencies & Parallel Execution

### Dependency Graph

```
Phase 1 (Setup: T001-T006)
    ↓
Phase 2 (Foundational: T007-T012)
    ↓
┌───┴───┬───────┐
↓       ↓       ↓
US1     US2     US3 (can start tests in parallel after Phase 2)
(T013-T026) (T027-T037) (T038-T056)
        ↓       ↓
        └───┬───┘
            ↓
           US4 (T057-T061)
            ↓
        Phase 7 (T062-T067)
```

### Parallel Execution Notes

**Within Phase 1**: T002, T003, T004, T006 can run simultaneously (different files)

**Within Phase 3 (US1 Tests)**: T013-T019 can run simultaneously (same test file, different test cases)

**Across User Stories** (after Phase 2):
- US1, US2, US3 test phases can run in parallel
- US1 implementation must complete before US3 can test end-to-end (needs queue)
- US2 implementation must complete before US3 can emit events

---

## Implementation Strategy

### MVP Scope (Recommended)
Complete Phases 1-5 (US1, US2, US3) for a functional AI processing pipeline.
User Story 4 (Queue Monitoring) can be deferred.

### Incremental Delivery
1. **First Increment**: Phase 1-2 + US1 → Users can submit assets
2. **Second Increment**: US2 + US3 → Full real-time pipeline works
3. **Third Increment**: US4 + Polish → Operational readiness

### Test Coverage Requirements (per Constitution III)
- Contract tests: all API endpoints (202, 400 variants, 401)
- Unit tests: queue service, AI client, event builders, job payload validation
- Integration tests: socket auth, room join, worker flow, retry/failure scenarios
- All tests MUST fail initially (Red), then pass after implementation (Green)
