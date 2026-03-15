# Follow-up Notes: Spec 002 Compliance

**Feature**: `002-ai-queue-pipeline`  
**Date**: 2026-03-14  
**Status**: Open

## Validation Snapshot

- `POST /api/assets/analyze-queue` has been brought back in line with the spec 002 OpenAPI contract:
  - `image` + canonical `category` are sufficient for a `202 Accepted`
  - invalid categories now return the contract-shaped validation error
  - the endpoint always queues AI work and returns `processing`
- The 7 core spec 002 suites are green:
  - `tests/unit/assets/queue.test.js`
  - `tests/unit/assets/socket-events.test.js`
  - `tests/unit/assets/ai-client.test.js`
  - `tests/contract/assets/analyze-queue.test.js`
  - `tests/contract/assets/queue-status.test.js`
  - `tests/integration/socket-auth.test.js`
  - `tests/integration/ai-pipeline.test.js`
- Full `server` `npm test` is still red outside spec 002. `T066` and `T067` remain unchecked until the broader suite is green and manual quickstart/E2E is re-run.

## Decision Record

### FR-004: Dead-Letter Queue

- Spec requirement: permanently failed jobs must be moved to a dead-letter queue for later inspection.
- Current code state: failed jobs are retained via BullMQ `removeOnFail` retention, but there is no explicit DLQ abstraction or inspection path in the feature surface.
- Decision: fix the code to satisfy the spec. Do not relax or reinterpret the spec to match the current implementation.
- Follow-up direction:
  - add an explicit DLQ access path or service abstraction over BullMQ failed jobs
  - expose inspection data needed for operational review
  - add tests that prove terminal failures are inspectable as DLQ entries

### FR-011: FIFO Processing

- Spec requirement: jobs must be processed in order of submission (FIFO).
- Current code state: the worker runs with `concurrency = 5`, which improves throughput but does not guarantee strict FIFO completion semantics.
- Decision: fix the code to satisfy the spec. Do not weaken the spec to justify the current concurrency model.
- Follow-up direction:
  - choose an implementation that enforces FIFO semantics end-to-end
  - update worker configuration and related tests accordingly
  - re-verify queue behavior under retries and stalled-job recovery after the FIFO change

## Recommended Next Step

- Implement FR-004 and FR-011 compliance work in code, then rerun full `server` `npm test` and the manual quickstart flow before re-checking `T066` and `T067`.
