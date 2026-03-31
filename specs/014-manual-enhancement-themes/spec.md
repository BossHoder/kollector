# Feature Specification: Manual Image Enhancement and Theme Presets

**Feature Branch**: `014-manual-enhancement-themes`  
**Created**: 2026-03-24  
**Status**: Draft  
**Input**: User description: "Manual non-AI image enhancement for distant/small-subject asset photos, plus preset themes for assets"

## Clarifications

### Session 2026-03-24

- Q: How should repeated manual enhancement requests for the same asset be handled while a job is already queued or running? -> A: Reject duplicate requests while a job is active.
- Q: What status code should the API return for a duplicate enhancement trigger while a job is active? -> A: Return 409 Conflict.
- Q: What retry policy should enhancement jobs use on transient failures? -> A: Retry up to 3 attempts with backoff, then mark as failed.
- Q: How should invalid or unknown theme preset IDs be handled on write operations? -> A: Reject update with validation error.
- Q: How should enhancement job status be exposed to clients? -> A: Persist status on asset and expose via standard asset reads; socket event is additive.
- Q: How should clients clear theme selections in v1? -> A: Both presentation.themeOverrideId and settings.preferences.assetTheme.defaultThemeId accept null to clear.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manually Enhance a Single Asset Image (Priority: P1)

As a user viewing an asset detail page, I can manually request an image enhancement job for that specific asset so small or distant subjects look clearer in detail view.

**Why this priority**: This is the core value of the feature and directly addresses low-quality captures that reduce asset usability.

**Independent Test**: Can be fully tested by triggering enhancement for one eligible asset and confirming request acceptance, asynchronous completion, and updated detail image selection without impacting existing AI processing behavior.

**Acceptance Scenarios**:

1. **Given** an authenticated user owns or can edit an asset with an original image, **When** they trigger manual enhancement for that asset, **Then** the system accepts the request as queued and returns a non-blocking accepted response.
2. **Given** an enhancement job completes successfully, **When** the user reopens asset detail, **Then** the detail image uses the enhanced derivative first while preserving the original image.
3. **Given** enhancement fails, **When** the user views the asset detail, **Then** the user still sees existing processed or original imagery and receives a clear failed-status outcome.
4. **Given** an enhancement job is already queued or running for an asset, **When** the user triggers enhancement again for that same asset, **Then** the API responds with 409 Conflict.

---

### User Story 2 - Apply Theme at Asset and Collection Levels (Priority: P2)

As a user, I can set a global default asset theme in account settings and override that theme for a specific asset so presentation can match context while remaining consistent by default.

**Why this priority**: Theme control is the second half of the requested v1 scope and is required for consistent cross-platform presentation.

**Independent Test**: Can be fully tested by setting a user default theme, overriding one asset, and confirming correct theme precedence in asset detail and listing views.

**Acceptance Scenarios**:

1. **Given** an authenticated user updates account preferences with a default asset theme, **When** assets are shown without per-asset override, **Then** the default theme is applied.
2. **Given** an asset has a specific theme override, **When** that asset is displayed, **Then** the override takes precedence over the user default.
3. **Given** no default and no override are set, **When** the asset is displayed, **Then** the system uses preset theme `vault-graphite` as the v1 fallback.
4. **Given** an asset currently has a theme override, **When** the user sets `presentation.themeOverrideId` to null, **Then** the override is cleared and resolution falls back to user default or `vault-graphite`.
5. **Given** a user currently has a default theme, **When** the user sets `settings.preferences.assetTheme.defaultThemeId` to null, **Then** the default is cleared and assets without per-asset override use `vault-graphite`.

---

### User Story 3 - Preserve Existing API and Rendering Contracts (Priority: P3)

As a platform team, we can introduce manual enhancement and theme presets without breaking existing API consumers, event consumers, and image field semantics.

**Why this priority**: Backward compatibility is a hard requirement and protects existing mobile, web, and integration clients.

**Independent Test**: Can be fully tested by running existing client flows and compatibility checks to verify old endpoints/events continue functioning while new fields/events are optional additions.

**Acceptance Scenarios**:

1. **Given** existing consumers of current asset and auth responses, **When** this feature is enabled, **Then** all previously required fields and behaviors remain valid and unchanged.
2. **Given** existing AI-processing subscribers rely on the current completion event, **When** manual enhancement is used, **Then** the current AI event remains intact and a separate enhancement completion event is emitted for the new flow.
3. **Given** list and card views expect list-oriented derivatives, **When** enhancement exists, **Then** thumbnail behavior remains unchanged for list/card while detail prefers enhanced imagery.

### Edge Cases

- If a user triggers enhancement while another enhancement job is active for the same asset, the duplicate request is rejected with 409 Conflict.
- Enhancement is requested for an asset that has no usable original image.
- Enhancement job completes but produces a low-quality or unusable output; fallback order still must display a valid image.
- Transient processing or storage failures are retried up to three attempts with backoff, then the job is marked failed.
- User sets a theme override or default theme that is no longer present in the active preset catalog.
- If a write request includes an unknown preset ID, the update is rejected and existing theme values remain unchanged.
- If a write request sets `presentation.themeOverrideId` to null, the override is cleared and no preset validation is required for that field.
- If a write request sets `settings.preferences.assetTheme.defaultThemeId` to null, the default is cleared and no preset validation is required for that field.
- Theme resolution order is deterministic in v1: `presentation.themeOverrideId` -> `settings.preferences.assetTheme.defaultThemeId` -> `vault-graphite`.
- If a client misses socket delivery, enhancement status and outcome remain available through standard asset reads.
- Unauthorized user attempts to enhance or set theme override for an asset they cannot edit.
- Cloud storage write for enhanced derivative fails after processing succeeds; asset remains readable with previous images.

## Requirements *(mandatory)*

### Assumptions

- v1 supports only a curated preset theme catalog and excludes user-uploaded background/theme assets.
- Manual enhancement remains an explicit user action per asset and does not auto-trigger during upload or edit.
- Existing authorization and ownership rules for asset mutation apply to enhancement and theme override operations.

### Functional Requirements

- **FR-001**: The system MUST support a manual, per-asset enhancement capability that is asynchronous and non-blocking for clients.
- **FR-002**: The endpoint contract for that capability MUST be `POST /api/assets/:id/enhance-image` and return HTTP 202 when accepted and queued.
- **FR-003**: Per-asset theme override MUST be handled through `PATCH /api/assets/:id` using `presentation.themeOverrideId`, and no separate per-asset theme endpoint may be added.
- **FR-004**: User default asset theme MUST be handled through `PATCH /api/auth/me` using `settings.preferences.assetTheme.defaultThemeId`, and no separate theme-preferences endpoint may be added.
- **FR-005**: The enhancement workflow MUST process jobs through queue `asset-enhancement`, separate from queue `ai-processing`.
- **FR-006**: The enhancement workflow MUST use only classical image-processing techniques and MUST NOT use AI super-resolution in v1.
- **FR-007**: Enhanced outputs MUST be stored as a distinct asset image derivative while preserving and never overwriting the original image.
- **FR-008**: Asset image semantics MUST keep `images.thumbnail` as the list/card derivative and MUST add `images.enhanced` for detail-first rendering.
- **FR-009**: Asset detail image selection MUST follow priority order: enhanced image first, then processed image, then original image.
- **FR-010**: Asset list and card experiences MUST continue to prioritize thumbnail derivatives regardless of enhanced-detail availability.
- **FR-011**: Existing AI completion event `asset_processed` MUST remain available and unchanged for current consumers.
- **FR-012**: The system MUST emit a new event `asset_image_enhanced` for manual enhancement completion outcomes.
- **FR-013**: Auth and user-public response payloads MUST support optional `settings.preferences.assetTheme` so clients can read a global theme default when present.
- **FR-014**: v1 theme support MUST use only predefined preset themes and MUST NOT allow custom background uploads.
- **FR-015**: New fields, events, and response additions introduced by this feature MUST be backward compatible and optional for existing clients.
- **FR-016**: Enhanced image storage MUST follow the existing Cloudinary-based asset media flow, and `images.original` must remain immutable.
- **FR-017**: The system MUST reject duplicate manual enhancement triggers for the same asset while an enhancement job for that asset is queued or running.
- **FR-018**: Duplicate manual enhancement triggers rejected due to an active job MUST return HTTP 409 Conflict.
- **FR-019**: Enhancement jobs MUST retry transient failures up to three attempts with backoff and MUST transition to failed status after the final unsuccessful attempt.
- **FR-020**: Writes to `presentation.themeOverrideId` and `settings.preferences.assetTheme.defaultThemeId` MUST reject unknown non-null preset IDs with a validation error and MUST NOT persist invalid values.
- **FR-021**: Enhancement status and outcome MUST be persisted on asset data and exposed through standard asset read responses; `asset_image_enhanced` socket events are additive notifications and not the only source of truth.
- **FR-022**: `presentation.themeOverrideId` MUST accept null to clear an existing override and fall back to `settings.preferences.assetTheme.defaultThemeId` or `vault-graphite`.
- **FR-023**: `settings.preferences.assetTheme.defaultThemeId` MUST accept null to clear an existing default and fall back to `vault-graphite`.
- **FR-024**: Theme resolution for v1 MUST be deterministic in this order: `presentation.themeOverrideId`, then `settings.preferences.assetTheme.defaultThemeId`, then `vault-graphite`.

### Key Entities *(include if feature involves data)*

- **Asset Image Set**: Image derivatives associated with an asset, including original, processed, thumbnail, card, and enhanced, with clear role semantics for each display context.
- **Enhancement Request**: A user-initiated asynchronous request tied to one asset, with status lifecycle from accepted/queued to completed/failed.
- **Theme Preset**: A catalog item representing an approved visual theme option selectable as global default or per-asset override.
- **User Asset Theme Preference**: Optional user-level preference block that stores default theme selection for asset presentation.
- **Asset Presentation Override**: Asset-level presentation metadata that can override user default theme for that specific asset.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of valid manual enhancement requests are acknowledged as queued within 2 seconds of user action.
- **SC-002**: At least 90% of successful enhancement requests provide an enhanced detail image within 60 seconds of acceptance under this load profile: 1 enhancement worker, 5 concurrent trigger requests, 100 accepted jobs, image mix (40% small 0.3-1.0MP, 40% medium 1.0-3.0MP, 20% large 3.0-8.0MP), retries enabled up to 3 attempts, measured over a continuous 30-minute window.
- **SC-003**: 100% of existing clients validated against previous contracts continue to function without required payload changes.
- **SC-004**: In user acceptance testing, at least 90% of participants can set a default theme and apply an asset-level override on their first attempt.
- **SC-005**: In asset detail views where an enhanced image exists, enhanced imagery is selected as the primary image in at least 99% of render events.

