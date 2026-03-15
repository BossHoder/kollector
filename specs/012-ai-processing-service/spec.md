# Feature Specification: AI Processing Service

**Feature Branch**: `012-ai-processing-service`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "Implement the real AI processing service for the existing backend queue pipeline. The server queue, worker, and realtime flow already exist, but the external AI service required by the worker is not implemented/runnable in the current repository. As a result, queued assets can reach processing state but ultimately fail instead of producing a processed image and extracted metadata. This feature must deliver a runnable AI service for local development and integration with the existing worker so that an uploaded asset can: (1) have its background removed, (2) return at least minimal metadata (brand/model/colorway when possible), (3) update the asset to active or partial on success, (4) fail clearly only when processing truly cannot be completed. Do not redesign the queue pipeline or mobile/web UX. Focus only on making real AI processing work end-to-end."

## Clarifications

### Session 2026-03-15

- Q: For MVP, is background removal required before metadata extraction, or can metadata-only success be accepted? Is 'partial' acceptable when background removal succeeds but metadata extraction fails? → A: Success requires background removal; set `active` when background removal succeeds and at least one of brand/model/colorway is present; set `partial` when background removal succeeds but all metadata fields are unknown/empty; never fail solely due to missing metadata.
- Q: What exact request/response contract must the Python AI service support for the current Node worker? → A: `POST {AI_SERVICE_URL}/analyze` with JSON `{ image_url, category }`, returning JSON with `processed_image_url` (or `processedImageUrl`) plus `brand/model/colorway` as either strings or `{ value, confidence }`. Non-2xx is an error; 5xx should be considered retryable.
- Q: Which models/tools are acceptable for MVP local development? → A: Use local HuggingFace models: `briaai/RMBG-1.4` for background removal and `vikhyatk/moondream2` (or similar local VLM) for best-effort metadata extraction.
- Q: What timeout budget should the AI service target? → A: 90 seconds per request (align with the Node client timeout).
- Q: Should processed images be uploaded by the AI service directly, or returned for server-side persistence? → A: AI service uploads the processed image and returns a `processed_image_url` (or `processedImageUrl`) in the `/analyze` response.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - End-to-End Processing Success (Priority: P1)

As a user who uploads an asset image, I want the system to automatically process it so I receive a usable image with the background removed and any available metadata, without the asset getting stuck or failing due to missing AI infrastructure.

**Why this priority**: This is the core value of the queue pipeline; without a runnable AI service the primary workflow cannot complete.

**Independent Test**: Upload a supported asset image and observe that it reaches a successful final state and has a processed image plus metadata returned (even if some metadata fields are unknown).

**Acceptance Scenarios**:

1. **Given** a supported asset image is uploaded and enqueued for processing, **When** processing runs end-to-end, **Then** the background-removed image is produced and the asset transitions to a successful final state.
2. **Given** the same asset is processed more than once (e.g., retry or re-run), **When** the system processes it again, **Then** the final asset state and outputs remain consistent and do not create duplicate or conflicting results.

---

### User Story 2 - Partial Success Without False Failures (Priority: P2)

As a user, I want processing to succeed even when metadata cannot be confidently extracted, so I still get the background-removed image and the asset is not marked as failed.

**Why this priority**: Metadata quality will vary by image quality; the system should deliver the primary value (clean image) even when enrichment is incomplete.

**Independent Test**: Upload an image where brand/model/colorway are difficult to determine and verify the asset still completes successfully with missing/unknown metadata.

**Acceptance Scenarios**:

1. **Given** an uploaded asset image is supported but metadata is ambiguous, **When** processing completes, **Then** the asset is marked as partially successful and includes the processed image with best-effort metadata (unknown where not confidently determined).

---

### User Story 3 - Clear, Actionable Failures (Priority: P3)

As a developer running the system locally, I want failures to be clearly explained and reserved for truly unprocessable cases, so I can troubleshoot quickly and avoid “mystery failures”.

**Why this priority**: The current behavior (reaching processing then failing) blocks development and erodes confidence; clear failures reduce debugging time.

**Independent Test**: Trigger a non-recoverable processing case (e.g., corrupt image) and confirm the asset ends in a failed final state with an explicit, actionable reason.

**Acceptance Scenarios**:

1. **Given** an uploaded file is corrupt or unsupported, **When** processing is attempted, **Then** the system fails the job with a clear error reason and the asset is not left in an indeterminate state.
2. **Given** a temporary processing dependency issue occurs, **When** the system retries or re-attempts processing, **Then** it either succeeds or fails with a clear “temporary vs permanent” classification and supporting details.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- AI processing service is not reachable during local development.
- Input image is missing, moved, or cannot be accessed when processing starts.
- Input image is corrupt, truncated, or unsupported.
- Background removal succeeds but returns an empty/invalid output.
- Background removal fails for one image but should succeed for others.
- Metadata extraction returns low-confidence guesses (system should prefer unknown vs incorrect).
- Processing time exceeds acceptable limits (timeouts, cancellations, retries).
- Duplicate processing requests for the same asset (safe to retry / consistent final state).
- Large images or unusual aspect ratios.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001 (Runnable Service)**: The repository MUST include a runnable AI processing service intended for local development.
- **FR-002 (Worker Integration)**: The existing worker MUST be able to invoke the AI processing service using configuration, without redesigning the queue pipeline.
- **FR-003 (Background Removal Output)**: For supported asset images, the system MUST produce a processed image with the background removed. Background removal is required for a successful outcome.
- **FR-004 (Metadata Output)**: The AI processing result MUST include best-effort metadata fields for `brand`, `model`, and `colorway` when these can be determined with reasonable confidence; otherwise fields MUST be returned as unknown/empty.
- **FR-005 (Best-Effort Completion)**: The system MUST treat “metadata unknown” as a successful (partial) outcome, not a failure, when background removal completes.
- **FR-006 (Asset State Updates)**: On successful processing, the system MUST update the asset to a successful final state:
  - “Active” when the processed image is produced and at least one of brand/model/colorway is non-empty.
  - “Partial” when the processed image is produced and all of brand/model/colorway are unknown/empty.
- **FR-007 (Failure Clarity)**: When processing cannot be completed, the system MUST record a clear failure reason that is actionable for developers (e.g., unsupported file, corrupt image, missing input, internal processing error).
- **FR-008 (Failure Only When Truly Necessary)**: The system MUST NOT mark an asset as failed solely due to partial metadata or other non-critical enrichment gaps.
- **FR-009 (Safe Reprocessing)**: Reprocessing the same asset input MUST NOT create conflicting results; repeated runs MUST converge on a consistent final state and consistent output artifacts.
- **FR-010 (Local Dev Documentation)**: The repository MUST provide minimal documentation for running the AI processing service locally and verifying an end-to-end processing run.
- **FR-011 (AI Service API Contract)**: The AI processing service MUST expose an HTTP endpoint `POST /analyze` that accepts JSON `{ "image_url": string, "category": string }` and returns JSON containing:
  - a processed image URL field (`processed_image_url` or `processedImageUrl`) when background removal succeeds, and
  - optional metadata fields `brand`, `model`, `colorway`, each as either a string or an object `{ value: string, confidence: number }`.
  Non-2xx responses MUST be treated as errors; server errors (HTTP 5xx) MUST be treated as retryable by the caller.
- **FR-012 (MVP Model Defaults)**: For MVP local development, the AI processing service MUST support background removal and best-effort metadata extraction using local, runnable models with defaults compatible with `briaai/RMBG-1.4` (background removal) and `vikhyatk/moondream2` (metadata extraction), with configuration allowing these defaults to be swapped without changing the Node worker.
- **FR-013 (Timeout Budget)**: For typical test images in local development, a single `/analyze` request SHOULD complete within 90 seconds; exceeding this budget SHOULD be treated as a retryable timeout by the caller.
- **FR-014 (Processed Image Persistence)**: The AI processing service MUST upload/persist the background-removed image and return it as a URL via `processed_image_url` (or `processedImageUrl`) in the `/analyze` response (i.e., it MUST NOT require the Node worker to upload raw image bytes for MVP).

### Key Entities *(include if feature involves data)*

- **Asset**: An uploaded item to be processed; includes current processing state and user-visible metadata.
- **Processing Job**: A queued unit of work linking an Asset to processing attempts and outcomes.
- **Processing Result**: The output of AI processing, including a processed image artifact and extracted metadata fields.
- **Extracted Metadata**: Best-effort values for brand/model/colorway plus an “unknown” state when not confidently determined.
- **Processing Error**: A structured error reason and details that explain why processing failed.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001 (Local E2E Works)**: In local development, a supported uploaded asset completes processing end-to-end and reaches a successful final state (Active or Partial) within 2 minutes for typical test images.
- **SC-002 (Background Removal Coverage)**: For a small curated local test set of supported images (minimum 5), at least 4/5 produce a usable background-removed output.
- **SC-003 (Metadata Best Effort)**: For the same curated set, at least 3/5 return at least one non-empty metadata field among brand/model/colorway (without returning clearly incorrect values).
- **SC-004 (Clear Failures)**: When processing fails for an unprocessable input, the failure includes a specific, human-readable reason that enables a developer to identify the root cause within 5 minutes.

## Dependencies

- The existing backend services (server, queue, worker) can be started locally and can communicate with a locally running AI processing service.
- A small set of representative test images is available for local verification of background removal and metadata extraction.

## Assumptions

- The existing backend queue pipeline, worker, and realtime update flow remain unchanged in structure; only the missing AI service and its integration points are completed.
- Asset processing has defined final states that distinguish full success, partial success, and failure.
- The primary value is background removal; metadata extraction is best-effort and may legitimately be unknown.

## Out of Scope

- Changes to mobile or web user experience, screens, or user flows.
- Redesign of the queue pipeline, job schema, or realtime flow beyond what is required to integrate the AI service.
- Perfect metadata accuracy; the goal is best-effort extraction with a bias toward unknown over incorrect.
