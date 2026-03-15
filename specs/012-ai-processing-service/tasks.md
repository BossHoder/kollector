---

description: "Executable task list for implementing the AI Processing Service"
---

# Tasks: AI Processing Service

**Input**: Design documents in `specs/012-ai-processing-service/` (spec.md, plan.md, research.md, data-model.md, contracts/ai-service.openapi.json, quickstart.md)

**Testing approach**: Test-first is REQUIRED by plan constitution. Write tests to fail first, then implement.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the Python service project runnable and testable locally (without yet implementing the AI logic).

- [X] T001 Populate Python dependencies in ai-worker/requirements.txt including minimal pinned ML runtime set for local CPU dev: torch, transformers, accelerate, numpy, plus service/test deps; document a known-good version combination for briaai/RMBG-1.4 and vikhyatk/moondream2.
- [X] T002 Create pytest scaffold in ai-worker/tests/ and add ai-worker/pytest.ini for test discovery
- [X] T003 [P] Update ai-worker/.env.example to include MODEL_REMOVE_BG, MODEL_VISION, HF_TOKEN placeholders (keep existing PORT/ENVIRONMENT/CLOUDINARY_/U2NET_HOME)
- [X] T004 [P] Implement container run path in ai-worker/Dockerfile (install deps from ai-worker/requirements.txt and run uvicorn for ai-worker/main.py:app)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service plumbing that MUST be complete before any user story work.

- [X] T005 Implement FastAPI app bootstrap + dotenv/env loading in ai-worker/main.py (export `app` for tests)
- [X] T006 Implement GET /health endpoint in ai-worker/main.py returning {"status":"ok"} per specs/012-ai-processing-service/contracts/ai-service.openapi.json
- [X] T007 Define AnalyzeRequest/AnalyzeResponse/ErrorResponse schemas in ai-worker/main.py matching specs/012-ai-processing-service/contracts/ai-service.openapi.json
- [X] T008 Implement image download helper in ai-worker/main.py (httpx GET image_url with timeouts, content-type validation, and bytes limit)
- [X] T008a [P] Add AI service timeout-budget tests in ai-worker/tests/test_analyze_time_budget.py covering explicit download / inference / upload budget enforcement and retryable over-budget failure behavior.
- [X] T008b Implement explicit per-stage time budgets in ai-worker/main.py so /analyze stays within the 90s target and returns retryable 5xx on timeout/over-budget work.
- [X] T009 Implement Cloudinary upload helper in ai-worker/main.py (upload processed PNG bytes and return a public URL)
- [X] T010 [P] Add contract test for /health in ai-worker/tests/test_health.py
- [X] T011 [P] Add contract tests for /analyze request validation (missing/invalid fields) in ai-worker/tests/test_analyze_validation.py

**Checkpoint**: AI service starts locally and passes health + basic contract validation tests.

---

## Phase 3: User Story 1 - End-to-End Processing Success (Priority: P1) 🎯 MVP

**Goal**: A runnable AI service can be called by the existing Node worker and returns a processed image URL + best-effort metadata for typical images.

**Independent Test**: Run AI service locally and process an uploaded asset; observe asset reaches a successful final state and `images.processed.url` is set.

### Tests for User Story 1 (write FIRST; must fail initially)

- [X] T012 [P] [US1] Add /analyze happy-path test with mocked inference + mocked Cloudinary upload in ai-worker/tests/test_analyze_success.py
- [X] T013 [P] [US1] Update worker integration tests to require processedImageUrl for success in server/tests/integration/ai-pipeline.test.js

### Implementation for User Story 1

- [X] T014 [US1] Implement background removal model loader + inference in ai-worker/main.py (default model from MODEL_REMOVE_BG, compatible with briaai/RMBG-1.4)
- [X] T015 [US1] Implement metadata extraction model loader + inference in ai-worker/main.py (default model from MODEL_VISION, compatible with vikhyatk/moondream2)
- [X] T016 [US1] Implement POST /analyze in ai-worker/main.py (download → remove background → upload → extract metadata → return response with processed_image_url)
- [X] T017 [US1] Add timing + structured logs for /analyze in ai-worker/main.py including requestId/correlationId, asset/job identifiers when available, category, duration, and whether processed_image_url is present.
- [X] T018 [US1] Update server/tests/integration/ai-pipeline.test.js “null processedImageUrl” case to expect a retryable failure (not a success)
- [X] T018a [P] [US1] Add worker integration test for safe reprocessing in server/tests/integration/ai-pipeline.test.js: process the same asset twice and assert deterministic final status, no duplicate/conflicting outputs, and stable overwrite/retain behavior for images.processed.url and aiMetadata.
- [X] T018b [US1] Implement idempotent/safe reprocessing behavior in server/src/workers/ai.worker.js and related helpers so repeated processing converges on one consistent final state.

**Checkpoint**: With local AI service running, the queue worker can complete a “typical” image end-to-end.

---

## Phase 4: User Story 2 - Partial Success Without False Failures (Priority: P2)

**Goal**: If background removal succeeds but brand/model/colorway are unknown, the asset is marked `partial` (not `failed`).

**Independent Test**: Upload an ambiguous image; verify asset completes successfully with status `partial` and a processed image URL.

### Tests for User Story 2 (write FIRST; must fail initially)

- [X] T019 [P] [US2] Add worker integration test for partial status when all metadata fields are null/empty in server/tests/integration/ai-pipeline.test.js
- [X] T020 [P] [US2] Add AI service test ensuring /analyze can return processed_image_url with null metadata (200 OK) in ai-worker/tests/test_analyze_partial.py

### Implementation for User Story 2

- [X] T021 [US2] Implement "active vs partial" status selection in server/src/workers/ai.worker.js using aiResult.brand/model/colorway values (requires processedImageUrl)
- [X] T022 [US2] Update success socket event building to allow status "partial" in server/src/modules/assets/assets.events.js (emit partial as success, not failure)
- [X] T023 [US2] Update the socket event contract to allow partial success in specs/002-ai-queue-pipeline/contracts/asset-processed-event.schema.json
- [X] T024 [US2] Update any socket events unit tests for the new partial status in server/tests/unit/assets/socket-events.test.js
- [X] T024a [US2] Version asset_processed success contract for partial support in specs/002-ai-queue-pipeline/contracts/asset-processed-event.schema.json and document backward-compatible acceptance of both legacy success payload and new status="partial" payload during migration.
- [X] T024b [US2] Add compatibility tests in server/tests/unit/assets/socket-events.test.js and any consumer-facing event contract tests to verify legacy success consumers do not break when partial is emitted.
- [X] T024c [US2] Document migration / rollout note in specs/012-ai-processing-service/quickstart.md (or feature notes) explaining event contract change, affected consumers, and temporary compatibility window.

**Checkpoint**: Ambiguous images complete as `partial` and do not produce failures/retries.

---

## Phase 5: User Story 3 - Clear, Actionable Failures (Priority: P3)

**Goal**: Truly unprocessable inputs fail with clear reasons, and retry behavior matches retryable vs non-retryable classifications.

**Independent Test**: Feed a corrupt/unsupported image_url and confirm the job fails with an actionable reason; feed a transient failure and confirm it retries.

### Tests for User Story 3 (write FIRST; must fail initially)

- [X] T025 [P] [US3] Add AI service test for corrupt/unsupported image_url returning 4xx with ErrorResponse in ai-worker/tests/test_analyze_errors.py
- [X] T026 [P] [US3] Update worker integration tests to ensure non-retryable AI errors do not keep retrying (discard job) in server/tests/integration/ai-pipeline.test.js

### Implementation for User Story 3

- [X] T027 [US3] Implement explicit error mapping in ai-worker/main.py: 400 for invalid request, 422 for unprocessable image, 500 for internal/retryable failures
- [X] T028 [US3] Ensure AI service never returns 200 without processed_image_url; treat missing output as 500 in ai-worker/main.py
- [X] T029 [US3] Update server/src/workers/ai.worker.js to stop retries for non-retryable errors using job.discard() if supported by the pinned BullMQ version, otherwise implement an explicit non-retryable path that bypasses further retry attempts and still records actionable failure metadata.
- [X] T030 [US3] Ensure failure reason is written to Asset.aiMetadata.error in server/src/workers/ai.worker.js via handleFailure() (keep error actionable)

**Checkpoint**: Failures are rare, clear, and correctly classified as retryable vs permanent.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, docs validation, and developer experience.

- [ ] T031 [P] Validate quickstart steps end-to-end and correct docs if needed in specs/012-ai-processing-service/quickstart.md
- [X] T032 [P] (Optional) Add a minimal local smoke script to call /health and /analyze in ai-worker/ (e.g., ai-worker/smoke_test.py) for manual validation
- [X] T033 Ensure ai-worker/.env stays out of git history and update ai-worker/.gitignore if needed (confirm .env.example is the only committed env file)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → blocks Foundational
- Foundational (Phase 2) → blocks all user stories
- US1 (Phase 3) → enables US2/US3 validation
- US2 (Phase 4) → depends on US1 plumbing
- US3 (Phase 5) → depends on US1 plumbing
- Polish (Phase 6) → after the targeted user stories

### User Story Completion Order (dependency graph)

- US1 (P1) → US2 (P2) → US3 (P3)

---

## Parallel Opportunities

- Phase 1: T003 and T004 can run in parallel
- Phase 2: T008a, T010, and T011 can run in parallel
- US1: T012 and T013 can run in parallel
- US2: T019 and T020 can run in parallel
- US3: T025 and T026 can run in parallel
- Polish: T031, T032, T033 can run in parallel

---

## Parallel Example: User Story 1

- T012 [US1] ai-worker/tests/test_analyze_success.py
- T013 [US1] server/tests/integration/ai-pipeline.test.js

---

## Implementation Strategy (MVP First)

1. Complete Phase 1–2 to make the AI service runnable and testable.
2. Implement US1 end-to-end success (background removal + upload + best-effort metadata).
3. Stop and validate the full pipeline via specs/012-ai-processing-service/quickstart.md.
4. Implement US2 partial semantics and socket payload support.
5. Implement US3 failure clarity + discard retries for non-retryable errors.
