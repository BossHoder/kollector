# Feature Specification: AI Queue Pipeline

**Feature Branch**: `002-ai-queue-pipeline`  
**Created**: 2025-12-18  
**Status**: Draft  
**Input**: User description: "AI Queue Pipeline - Build the backend processing engine. Requirements: 1. Setup BullMQ connected to Redis. 2. Create ai.worker.js that processes jobs from ai-processing queue. 3. Integrate Socket.io: Emit asset_processed event when job completes. 4. Create API endpoint POST /api/assets/analyze-queue."

## Assumptions

- Redis connection details will be configured via environment variables (REDIS_URL or REDIS_HOST/PORT)
- The Python AI Worker (already exists in `ai-worker/`) will be called via HTTP to process images
- Socket.io clients will authenticate using the same JWT tokens as the REST API
- Job retries will use exponential backoff with a maximum of 3 attempts
- Failed jobs after all retries will be moved to a dead-letter queue for manual review

## Clarifications

### Session 2025-12-18
- Q: When calling POST /api/assets/analyze-queue, what should the endpoint do? → A: Create a new draft Asset + enqueue AI job in one request.
- Q: When AI processing fails after all retries, what should the Asset’s status become? → A: failed.
- Q: What image input format should POST /api/assets/analyze-queue accept? → A: multipart/form-data with a file field (e.g., image).
- Q: When emitting the asset_processed Socket.io event, how should delivery be scoped? → A: Emit to a per-user room (all sockets for that user receive it).
- Q: For Socket.io authentication, how should the client provide the JWT access token during the connection handshake? → A: Socket.io handshake auth: { token: "<accessToken>" }.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Asset for AI Processing (Priority: P1)

An authenticated user wants to upload an image of their collectible and have it automatically processed by the AI system. They submit the image (and minimal asset info like category), and the system creates a new draft asset and queues it for background processing while immediately confirming receipt.

**Why this priority**: This is the entry point for the entire AI processing pipeline. Users need to be able to submit assets for processing before any other queue-related functionality matters. This enables the core AI-powered feature of automatic metadata extraction.

**Independent Test**: Can be fully tested by submitting an asset image via the analyze-queue endpoint and verifying (1) a new asset is created and (2) a job is created in the queue referencing that asset. Delivers the ability for users to initiate AI processing of their collectibles.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they submit a valid `multipart/form-data` request with an image file and category for AI analysis, **Then** system creates a new asset owned by the user, returns a job reference ID and asset ID, and the asset status is set to "processing"
2. **Given** an authenticated user, **When** they submit a request without an image file in the expected form field, **Then** system returns a validation error
3. **Given** an unauthenticated request, **When** calling the endpoint, **Then** system returns 401 unauthorized error
4. **Given** an authenticated user, **When** they submit an invalid category, **Then** system returns a validation error listing valid categories

---

### User Story 2 - Receive Real-Time Processing Updates (Priority: P1)

A user who has submitted an asset for AI processing wants to receive immediate notification when processing completes. They stay connected to the app and automatically see the results appear without needing to refresh or poll.

**Why this priority**: Real-time feedback is critical for user experience. Without notifications, users would need to constantly refresh to check status, leading to poor experience and unnecessary server load.

**Independent Test**: Can be fully tested by connecting a client, submitting an asset for processing, and verifying the completion event is received with correct payload. Delivers instant feedback to users about their processed assets.

**Acceptance Scenarios**:

1. **Given** a connected user waiting for their asset to process (possibly on multiple devices), **When** AI processing completes successfully, **Then** all connected clients for that user receive an event containing the asset ID, updated status, and extracted metadata
2. **Given** a connected user, **When** AI processing fails, **Then** user receives an event containing the asset ID, error status, and a user-friendly error message
3. **Given** a user who disconnects and reconnects, **When** processing completed while they were disconnected, **Then** they can query the asset to see the updated status (no missed event recovery required)

---

### User Story 3 - Background Job Processing (Priority: P1)

The system needs to reliably process queued AI jobs in the background, calling the external AI service, and updating asset records with the results. This happens automatically without user intervention.

**Why this priority**: This is the core engine that makes the entire feature work. Without reliable background processing, submitted assets would never be processed. This is foundational infrastructure.

**Independent Test**: Can be fully tested by adding a job to the queue and verifying the worker processes it, calls the AI service, and updates the database correctly. Delivers automated AI processing of user assets.

**Acceptance Scenarios**:

1. **Given** a job in the AI processing queue, **When** the worker picks it up, **Then** it calls the AI service with the correct image URL and asset details
2. **Given** the AI service returns successful results, **When** the worker receives the response, **Then** it updates the asset with extracted metadata, changes status to "active", and emits a completion event
3. **Given** the AI service returns an error, **When** the worker processes the failure, **Then** it retries according to the retry policy before marking as failed
4. **Given** a job has failed all retry attempts, **When** final failure occurs, **Then** the asset status is updated to "failed", an error event is emitted, and the job is moved to the dead-letter queue

---

### User Story 4 - Monitor Queue Health (Priority: P3)

An administrator or developer wants to understand the health and performance of the job queue to identify bottlenecks or issues. They can view basic queue metrics.

**Why this priority**: While important for operations, monitoring is not required for the core user-facing functionality to work. This can be added after the main pipeline is operational.

**Independent Test**: Can be tested by querying queue metrics and verifying accurate counts are returned. Delivers operational visibility into the processing pipeline.

**Acceptance Scenarios**:

1. **Given** an authenticated admin, **When** they request queue status, **Then** system returns counts of waiting, active, completed, and failed jobs
2. **Given** jobs in the dead-letter queue, **When** admin requests failed job details, **Then** system returns job IDs and failure reasons

---

### Edge Cases

- What happens when Redis connection is lost mid-processing? The job should be recoverable when connection is restored.
- What happens when the AI service is unavailable? Jobs should be retried with exponential backoff.
- What happens when a user submits an asset with a corrupted/invalid image URL? The AI service should return an error, and the asset should be marked as failed with a descriptive message.
- What happens when the worker crashes while processing a job? The job should remain in the queue and be picked up by another worker instance (or the same one after restart).
- What happens when a user deletes an asset while it's being processed? The worker should detect the missing asset and gracefully skip processing.

## Requirements *(mandatory)*

### Functional Requirements

#### Queue Infrastructure
- **FR-001**: System MUST establish a connection to a Redis-compatible queue service on startup
- **FR-002**: System MUST create a named queue ("ai-processing") for AI processing jobs
- **FR-003**: System MUST support configurable retry attempts (default: 3) with exponential backoff for failed jobs
- **FR-004**: System MUST move permanently failed jobs to a dead-letter queue for later inspection

#### API Endpoint
- **FR-005**: System MUST provide an endpoint to submit assets for AI processing at POST /api/assets/analyze-queue
- **FR-006**: System MUST accept `multipart/form-data` with an image file and minimal asset info (at minimum: category)
- **FR-007**: System MUST create a new draft asset owned by the authenticated user as part of handling the request
- **FR-008**: System MUST enqueue a processing job referencing the newly created asset
- **FR-009**: System MUST set the new asset status to "processing" when a job is successfully queued
- **FR-010**: System MUST return a job reference ID and the created asset ID

#### Worker Processing
- **FR-011**: System MUST process jobs from the "ai-processing" queue in order of submission (FIFO)
- **FR-012**: System MUST call the external AI service with the asset's original image URL
- **FR-013**: System MUST update the asset record with AI-extracted metadata (brand, model, confidence scores) upon successful processing
- **FR-014**: System MUST update asset status to "active" upon successful processing
- **FR-015**: System MUST update asset status to "failed" if processing fails after all retries
- **FR-015**: System MUST update asset status to "failed" if processing fails after all retries
- **FR-016**: System MUST handle worker crashes gracefully - in-progress jobs should be re-processable

#### Real-Time Notifications
- **FR-017**: System MUST support persistent connections for real-time event delivery
- **FR-018**: System MUST authenticate connected clients using the same credentials as the REST API
- **FR-018a**: System MUST accept JWT access tokens via Socket.io handshake `auth.token`
- **FR-019**: System MUST emit an "asset_processed" event when AI processing completes (success or failure)
- **FR-020**: System MUST include asset ID, new status, and relevant data in the event payload
- **FR-021**: System MUST only deliver events to the user who owns the asset (no cross-user leakage)
- **FR-022**: System MUST deliver the event by emitting to a per-user channel/room so all of that user's connected clients receive it

### Key Entities

- **Job**: Represents a unit of work in the processing queue. Contains asset ID, user ID, image URL, creation timestamp, and processing attempts count. Transitions through states: waiting → active → completed/failed.
- **Queue**: Named processing channel ("ai-processing") that holds jobs waiting to be processed. Maintains job ordering and supports retry policies.
- **Dead Letter Queue**: Secondary queue that holds jobs that have exhausted all retry attempts for manual inspection and potential reprocessing.
- **Socket Connection**: Authenticated real-time channel between a user's client and the server. Scoped to a specific user for event delivery.
- **User Room/Channel**: A real-time grouping keyed by user identity used to deliver `asset_processed` events to all connected clients for that user.
- **Asset (status lifecycle)**: For this feature, assets are created as draft and immediately transition to processing when queued; then transition to active on success or failed on terminal failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users receive confirmation of job submission within 2 seconds of submitting an asset for analysis
- **SC-002**: 95% of assets are fully processed within 60 seconds of submission under normal load
- **SC-003**: Users receive real-time notification within 1 second of processing completion
- **SC-004**: System successfully processes 100 concurrent jobs without job loss or duplicate processing
- **SC-005**: Failed jobs are automatically retried, with 90% of transient failures recovered on retry
- **SC-006**: Zero events are delivered to incorrect users (100% event delivery accuracy)
