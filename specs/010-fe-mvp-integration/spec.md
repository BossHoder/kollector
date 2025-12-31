# Feature Specification: FE MVP Integration

**Feature Branch**: `010-fe-mvp-integration`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: Connect Vite web frontend with backend (001/002) using existing UI prototypes

## Clarifications

### Session 2025-12-30

- Q: What should FE display when asset has status `partial`? → A: Display as unique "Partial" status with orange/yellow color
- Q: What is the accessibility requirement level for MVP? → A: Basic a11y - semantic HTML, focus management, keyboard navigation on forms
- Q: How long should toast notifications remain visible? → A: Different durations - success/info=3s auto-dismiss, error=persistent until manually dismissed
- Q: Which image formats should the upload accept? → A: JPEG and PNG only (image/jpeg, image/png)
- Q: What should happen when user clicks "Retry" on a failed asset? → A: Re-queue existing original image for AI processing (POST /api/assets/:id/retry)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login and View Assets (Priority: P1)

A registered user opens the web app, logs in with their credentials, and sees their personal asset collection displayed in a grid with proper status indicators.

**Why this priority**: This is the foundational user journey. Without authentication and the ability to view assets, no other feature can be used. It validates the core integration between FE and BE.

**Independent Test**: Can be fully tested by logging in with valid credentials and verifying the assets grid displays with correct status badges (Ready, Processing, Failed). Delivers the core value of accessing the collection.

**Acceptance Scenarios**:

1. **Given** a registered user on the login page, **When** they enter valid email/password and submit, **Then** they are redirected to `/app/assets` and see their assets grid (or empty state if no assets).
2. **Given** a logged-in user on `/app/assets`, **When** the page loads, **Then** assets are displayed with skeleton loading states first, then populated with real data including status pills (Ready/Processing/Failed).
3. **Given** a user with many assets, **When** they scroll to the bottom and click "Tải thêm assets", **Then** cursor-based pagination loads more items without reloading the page.
4. **Given** a logged-in user, **When** their access token expires and they make a request, **Then** the system silently refreshes the token and retries the request without showing an error.
5. **Given** an unauthenticated user, **When** they try to access `/app/*` routes, **Then** they are redirected to `/login`.

---

### User Story 2 - Upload and Analyze New Asset (Priority: P2)

A logged-in user uploads a new collectible image with a category, the system queues it for AI processing, and the user is redirected to a detail page showing the processing state.

**Why this priority**: This is the second most critical flow—adding new items to the collection. It validates the upload → queue → realtime update pipeline.

**Independent Test**: Can be fully tested by uploading an image with category selection, receiving a 202 response, and seeing the detail page in "Processing" state. Delivers the core value of adding new collectibles.

**Acceptance Scenarios**:

1. **Given** a logged-in user on `/app/assets/new`, **When** they drag-drop or select an image file (JPG/PNG ≤10MB) and choose a category, **Then** the "Analyze" button becomes enabled.
2. **Given** a valid image and category selected, **When** the user clicks "Analyze", **Then** a multipart POST to `/api/assets/analyze-queue` is sent, and on 202 Accepted, the user is redirected to `/app/assets/:id`.
3. **Given** the user is redirected to the detail page, **When** the asset status is "processing", **Then** the UI displays the processing overlay with spinner and "Analyzing..." text per prototype.
4. **Given** the user uploads a file >10MB, **When** they try to submit, **Then** an error message "Kích thước tệp quá lớn. Vui lòng chọn ảnh dưới 10MB." is shown (413 handling).
5. **Given** the user uploads an invalid file type, **When** they try to submit, **Then** an error message is shown (400 handling).

---

### User Story 3 - View Asset Detail with Toggle (Priority: P3)

A logged-in user navigates to an asset's detail page and can view AI analysis results, toggle between processed/original image views, and see the correct status-based UI.

**Why this priority**: Completes the view cycle. Users need to see detailed information about their assets after uploading or from the library.

**Independent Test**: Can be fully tested by clicking an asset card from the library and verifying the detail page shows AI metadata, image toggle, and status-specific UI.

**Acceptance Scenarios**:

1. **Given** a logged-in user on `/app/assets`, **When** they click an asset card, **Then** they navigate to `/app/assets/:id` and see the asset detail page.
2. **Given** an asset with status "active" (Ready), **When** the detail page loads, **Then** the UI shows the green "Ready" pill, AI analysis results (brand, model with confidence bars), and the Processed/Original image toggle.
3. **Given** an asset with status "processing", **When** the detail page loads, **Then** the UI shows the "Processing" overlay with spinner, and detail sections are dimmed/disabled.
4. **Given** an asset with status "archived", **When** the detail page loads, **Then** the UI shows an "Archived" indicator (gray styling).
5. **Given** the user clicks "Original" toggle, **When** the toggle switches, **Then** the image view changes to display `images.original.url` instead of `images.processed.url`.

---

### User Story 4 - Realtime Updates via Socket (Priority: P4)

A logged-in user receives real-time updates when their assets complete AI processing, updating both the library list and detail page without manual refresh.

**Why this priority**: Provides the "magic" experience of seeing assets update in real-time. Depends on core flows (P1-P3) being functional first.

**Independent Test**: Can be tested by uploading an asset, navigating to detail page, and waiting for the socket event to automatically update the status from "Processing" to "Ready" or "Failed".

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** login completes successfully, **Then** a Socket.io connection is established to the server.
2. **Given** an open socket connection, **When** the server emits `asset_processed` event for an asset the user owns, **Then** if that asset is visible in the library grid, its card updates to reflect the new status.
3. **Given** a user on the detail page for an asset in "processing" status, **When** the server emits `asset_processed` with `status: "active"`, **Then** the page updates to show "Ready" status, AI metadata appears, and processed image loads—without page reload.
4. **Given** a user on the detail page for an asset in "processing" status, **When** the server emits `asset_processed` with `status: "failed"`, **Then** the page updates to show "Failed" status with error message and retry option.
5. **Given** the socket disconnects unexpectedly, **When** the user is on `/app/*` routes, **Then** a "Reconnecting…" banner appears at the top of the screen, and the system attempts reconnection.

---

### User Story 5 - Settings and Logout (Priority: P5)

A logged-in user can access settings to view socket connection status and log out of the application.

**Why this priority**: Essential for session management but not part of the core value proposition. Simple implementation.

**Independent Test**: Can be tested by navigating to `/app/settings`, verifying socket status indicator, and clicking logout to confirm redirect to login.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they navigate to `/app/settings`, **Then** they see their basic profile info (email) and socket connection status indicator (green = connected, red = disconnected).
2. **Given** a logged-in user on settings page, **When** they click "Đăng xuất" (Logout), **Then** the access/refresh tokens are cleared, socket disconnected, and user is redirected to `/login`.

---

### User Story 6 - Public Pages (Priority: P6)

Unauthenticated users can view the home page and access login/register flows.

**Why this priority**: Lowest priority as these are entry points, not core value. Simple static/form pages.

**Independent Test**: Can be tested by visiting `/`, `/login`, `/register` without authentication and verifying proper rendering.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they visit `/`, **Then** they see the home page per `stitch_kollector_home_page` prototype with navigation to login/register.
2. **Given** an unauthenticated user on `/register`, **When** they fill in email, password, confirm password and submit, **Then** on success (201) they are logged in and redirected to `/app/assets`.
3. **Given** a user registering with an email already in use, **When** they submit, **Then** an error message "Email đã được sử dụng" is shown (409 handling).

---

### Edge Cases

- **Token Refresh Race Condition**: If multiple 401 responses occur simultaneously, only one refresh request should be made; others should queue and retry after refresh completes.
- **Socket Reconnection Limit**: After 5 failed reconnection attempts, show a persistent error banner with manual "Reconnect" button.
- **Large Batch Updates**: If socket emits multiple `asset_processed` events in quick succession, UI should debounce updates to prevent excessive re-renders.
- **Network Offline**: If navigator reports offline, show "Bạn đang ngoại tuyến" banner and pause socket reconnection attempts until online.
- **Upload in Progress + Navigation**: If user navigates away during upload, show confirmation dialog "Đang tải lên, bạn có chắc muốn rời đi?".

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication (Auth)

- **FR-AUTH-001**: System MUST display login form matching `stitch_kollector_login_page` prototype.
- **FR-AUTH-002**: System MUST call `POST /api/auth/login` with `{email, password}` and store `accessToken` and `refreshToken` on success.
- **FR-AUTH-003**: System MUST display register form matching `stitch_kollector_register_page` prototype.
- **FR-AUTH-004**: System MUST call `POST /api/auth/register` with `{email, password}` and auto-login on 201.
- **FR-AUTH-005**: System MUST intercept 401 responses, call `POST /api/auth/refresh` with cookie (web platform), and retry the original request with new token.
- **FR-AUTH-006**: System MUST protect all `/app/*` routes; redirect unauthenticated users to `/login`.
- **FR-AUTH-007**: System MUST clear tokens and disconnect socket on logout.

#### Assets Library

- **FR-LIB-001**: System MUST fetch assets via `GET /api/assets` with cursor pagination.
- **FR-LIB-002**: System MUST display assets in a grid matching `stitch_kollector_assets_library_page` prototype.
- **FR-LIB-003**: System MUST show skeleton loading cards during initial fetch per prototype.
- **FR-LIB-004**: System MUST show empty state "No assets found" per prototype when list is empty.
- **FR-LIB-005**: System MUST display status pills on each card: Ready (green), Processing (animated), Failed (red), Archived (gray), Partial (orange/yellow - indicates incomplete AI analysis).
- **FR-LIB-006**: System MUST support "Tải thêm assets" button using `nextCursor` for pagination.
- **FR-LIB-007**: System MUST support category filter tabs (Tất cả, Sneaker, Lego, Camera, Khác) via `?category=` query param.
- **FR-LIB-008**: System MUST support status filter chips via `?status=` query param.

#### Upload & Analyze

- **FR-UPL-001**: System MUST display upload form matching `stitch_kollector_upload_page` prototype.
- **FR-UPL-002**: System MUST support drag-and-drop and file picker for image selection.
- **FR-UPL-003**: System MUST validate file type (JPEG or PNG only: image/jpeg, image/png) and size (≤10MB) client-side before upload.
- **FR-UPL-004**: System MUST require category selection from dropdown (sneaker, lego, camera, other).
- **FR-UPL-005**: System MUST call `POST /api/assets/analyze-queue` with multipart form (image + category).
- **FR-UPL-006**: System MUST handle 202 Accepted by extracting `assetId` and redirecting to `/app/assets/:assetId`.
- **FR-UPL-007**: System MUST display upload progress indicator during file transfer.

#### Asset Detail

- **FR-DET-001**: System MUST fetch asset via `GET /api/assets/:id`.
- **FR-DET-002**: System MUST display detail page matching `stitch_kollector_assets_detail_page` prototype.
- **FR-DET-003**: System MUST render status-specific UI: "Ready" shows full detail; "Processing" shows overlay; "Failed" shows error with retry; "Partial" shows available AI data with warning indicator for incomplete fields.
- **FR-DET-004**: System MUST display AI metadata (brand, model, colorway) with confidence percentage bars.
- **FR-DET-005**: System MUST provide Processed/Original image toggle.
- **FR-DET-006**: System MUST display asset ID in monospace font.
- **FR-DET-007**: System MUST provide "Retry" button for failed assets that calls `POST /api/assets/:id/retry` to re-queue existing original image for AI processing, then update status to "processing".

#### Realtime (Socket.io)

- **FR-RT-001**: System MUST establish Socket.io connection after successful login, authenticated with access token.
- **FR-RT-002**: System MUST listen for `asset_processed` events and update corresponding asset in library/detail views.
- **FR-RT-003**: System MUST show toast notification when `asset_processed` event is received.
- **FR-RT-003a**: Toast notifications MUST auto-dismiss after 3 seconds for success/info types; error toasts MUST persist until manually dismissed.
- **FR-RT-004**: System MUST display "Reconnecting…" banner when socket disconnects.
- **FR-RT-005**: System MUST attempt automatic reconnection with exponential backoff.
- **FR-RT-006**: System MUST show socket status indicator in header (green dot = connected, as per prototype).

#### Error Handling

- **FR-ERR-001**: System MUST map 400 errors to "Dữ liệu không hợp lệ" with field-specific messages.
- **FR-ERR-002**: System MUST map 401 errors to token refresh flow; if refresh fails, redirect to login.
- **FR-ERR-003**: System MUST map 413 errors to "Kích thước tệp quá lớn. Vui lòng chọn ảnh dưới 10MB."
- **FR-ERR-004**: System MUST map 503 errors to "Hệ thống đang bận, vui lòng thử lại sau."
- **FR-ERR-005**: System MUST map 409 (conflict) to "Email đã được sử dụng" for registration.

#### Accessibility (Basic)

- **FR-A11Y-001**: System MUST use semantic HTML elements (button, nav, main, header, form, label, etc.) appropriately.
- **FR-A11Y-002**: System MUST ensure all form inputs have associated labels (visible or aria-label).
- **FR-A11Y-003**: System MUST manage focus correctly: auto-focus first field on form pages, return focus after modal close.
- **FR-A11Y-004**: System MUST ensure all interactive elements are keyboard accessible (Tab, Enter, Escape).
- **FR-A11Y-005**: System MUST provide visible focus indicators on interactive elements.

### Key Entities

- **User Session**: Access token, refresh token, user profile (id, email), socket connection status.
- **Asset Card (Library View)**: id, images.processed.url, aiMetadata.brand.value, aiMetadata.model.value, status, category, createdAt.
- **Asset Detail**: Full asset object including images (original, processed), aiMetadata (brand, model, colorway with confidence), condition, status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete login and view assets list within 3 seconds on standard broadband connection.
- **SC-002**: Upload to detail page redirect completes within 2 seconds (not including AI processing time).
- **SC-003**: 100% of realtime `asset_processed` events received by connected clients result in UI updates within 500ms.
- **SC-004**: Token refresh flow succeeds silently in 95%+ of cases without user-visible error.
- **SC-005**: All screens visually match Stitch prototypes with maximum 5% deviation (responsive/accessibility adjustments only).
- **SC-006**: Load More pagination fetches next page within 1 second.
- **SC-007**: Socket reconnection succeeds within 30 seconds in 90%+ of temporary disconnection scenarios.

## Assumptions

- Backend APIs (001-foundation-backend-setup, 002-ai-queue-pipeline) are fully implemented and deployed.
- Cloudinary URLs for images are directly accessible from browser (CORS configured).
- Socket.io server supports web client authentication via access token.
- Web clients use cookies for refresh token (per `X-Client-Platform: web` behavior).
- Stitch prototypes use Tailwind CSS classes that can be extracted and reused in React components.

## Out of Scope

Per Constitution FE MVP Scope:

- Maintenance mini-game (Tamagotchi cleaning interaction)
- NFC tag integration
- Social sharing functionality
- FIFA-style card generation
- Dashboard / analytics views
- Home page gamification widgets
- Asset editing (PATCH operations beyond status)
- Asset deletion
- Search functionality (text search in assets)
