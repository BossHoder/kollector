# Research: AI Processing Service (Local Runnable)

**Feature**: `012-ai-processing-service`  
**Date**: 2026-03-15

## Goals (from spec)

- Deliver a runnable AI service for local development that integrates with the existing Node worker.
- Provide background removal + best-effort metadata extraction.
- Return clear failures only when processing truly cannot complete.

## Decisions

### 1) API contract: Node worker ↔ AI service

- **Decision**: Use the existing Node client contract: `POST {AI_SERVICE_URL}/analyze` with JSON `{ image_url, category }`.
- **Rationale**: The worker already implements this call pattern and parses this response format. Matching it avoids redesigning the queue pipeline.
- **Alternatives considered**:
  - Multipart upload (send image bytes): rejected (would require Node worker changes and larger payloads).
  - Base64 in response: rejected (large responses; more memory pressure; not aligned with current worker expectation).

### 2) Success/partial/failure semantics

- **Decision**:
  - **Success requires background removal output**.
  - Set asset `status=active` when background removal succeeds and at least one of `brand/model/colorway` is present.
  - Set asset `status=partial` when background removal succeeds but all metadata fields are unknown/empty.
  - Never fail solely due to missing metadata.
- **Rationale**: Background removal is the primary user value; metadata is best-effort and legitimately unavailable in some cases.
- **Alternatives considered**:
  - Metadata-only success: rejected for MVP (doesn’t meet primary user value).

### 3) Processed image persistence

- **Decision**: The AI service uploads/persists the processed image and returns it via `processed_image_url` (or `processedImageUrl`).
- **Rationale**: Matches current Node worker behavior (expects a URL), keeps payloads small, and avoids introducing new persistence flows.
- **Alternatives considered**:
  - Node uploads processed image: rejected (requires sending bytes back through the worker).
  - Shared filesystem output: rejected (fragile and not portable).

### 4) Model/tooling for MVP

- **Decision**: Use local, runnable Hugging Face models for MVP:
  - Background removal default compatible with `briaai/RMBG-1.4`.
  - Metadata extraction default compatible with `vikhyatk/moondream2` (or equivalent local vision-language model).
- **Rationale**: Keeps development fully local/offline-capable and aligned with repo/constitution constraints.
- **Alternatives considered**:
  - Hosted LLM API for metadata: rejected (external dependency; keys; cost; variance).
  - Heuristics-only metadata: allowed as fallback but not the default goal (too often unknown).

### 5) Timeout budget and retry semantics

- **Decision**: Target 90 seconds per `/analyze` request, aligning with the Node client timeout (`AI_SERVICE_TIMEOUT=90000ms`).
- **Rationale**: Consistent behavior across services; avoids premature timeouts on slower machines or first-run model loads.
- **Alternatives considered**:
  - Shorter timeouts: rejected (likely too aggressive for model cold starts).

### 6) Health check endpoint

- **Decision**: Provide `GET /health` returning HTTP 200 with a small JSON payload (e.g., `{ status: "ok" }`) and optional model readiness indicators.
- **Rationale**: Enables local dev verification and simple liveness checks without coupling to the analysis endpoint.
- **Alternatives considered**:
  - No health check: rejected (harder to debug local startup issues).

### 7) Error classification

- **Decision**: AI service should differentiate:
  - **Retryable** failures: transient network/download errors, upload failures, model loading errors that may resolve, temporary GPU/CPU resource errors.
  - **Non-retryable** failures: unsupported/corrupt image input, invalid request shape, permanently missing image.
- **Rationale**: The Node worker treats 5xx as retryable; clear separation prevents infinite retries on permanent failures.

## Open Questions

None required to proceed to design artifacts for this feature.
