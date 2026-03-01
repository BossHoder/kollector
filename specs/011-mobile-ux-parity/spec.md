# Feature Specification: Mobile UX Parity (Web → Mobile)

**Feature Branch**: `011-mobile-ux-parity`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "Mobile UX Parity (Web → Mobile) - Bring web design language to mobile with mobile-first patterns"

## Overview

Bring the Kollector web experience to mobile while adapting UX patterns for mobile-native interaction. The mobile app should feel familiar to existing web users through consistent brand, terminology, and semantics—but layouts and interactions must follow mobile-first conventions (single-column, bottom tabs, bottom sheets, thumb-zone CTAs).

### Parity Principles

**Must Stay Consistent (Parity Required)**:
- Brand/design language: color palette, typography, spacing scale, border radius, shadows, icon style
- Terminology & key labels: status names, primary CTA labels, category naming
- State semantics & feedback: skeleton/loading patterns, toast behavior (success/info auto-dismiss; errors persist), reconnecting banner
- Information model: every asset has image + status + analysis + condition + metadata

**Must Be Adapted for Mobile**:
- Navigation: bottom tabs and stack navigation (no sidebar)
- Layout: single-column detail views; secondary panels as cards/accordions; actions via bottom sheet or sticky footer
- Filters/search: filters surfaced in bottom sheet; horizontal chips/tabs for active filters
- Thumb-zone CTAs: primary actions reachable one-handed (FAB or sticky button)
- Interactions: tap/press/long-press instead of hover; adequate tap targets (minimum 44pt)

### Scope

**In Scope (MVP)**:
- Auth: Login + Register
- Assets Library: list/grid view, search, category/status filters, pagination or infinite scroll
- Upload & Analyze: camera/gallery selection + category selection + submit; navigate to detail in Processing state
- Asset Detail: render by status; Processed/Original toggle; view AI analysis + condition + metadata; retry on failed; archive action
- Realtime: status/metadata updates without manual refresh

**Out of Scope**:
- Marketplace, social features, advanced gamification
- Push notifications, NFC scanning
- Pricing/plans, admin dashboard

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login and Browse Assets Library (Priority: P1)

A mobile user opens the app, logs in with valid credentials, and lands on the Assets Library. The user can browse their assets, apply filters, and scroll through results. This is the core entry point to the app and must work flawlessly.

**Why this priority**: Without login and library browsing, users cannot access any other features. This is the foundational flow.

**Independent Test**: Can be fully tested by logging in with test credentials and verifying the library displays correct assets with status pills. Delivers immediate value—users can see their collection.

**Acceptance Scenarios**:

1. **Given** a user with valid credentials, **When** the user submits login, **Then** the app navigates to Assets Library showing asset cards with correct status pills
2. **Given** the asset list is loading, **When** the library screen mounts, **Then** a skeleton UI is displayed until data loads
3. **Given** assets have loaded, **When** the user views the library, **Then** each card shows thumbnail, title, and status pill with correct color
4. **Given** the user applies category or status filters, **When** filters are active, **Then** the list updates to show only matching assets and active filters are visually indicated (chips)
5. **Given** the user scrolls to the end of the list, **When** more assets exist, **Then** additional assets load automatically (infinite scroll) or a "Load more" button appears
6. **Given** the auth token expires during a session, **When** an API request fails with 401, **Then** the app attempts silent token refresh; if refresh succeeds, retry the request; if refresh fails, redirect to login

---

### User Story 2 - Upload and Analyze an Asset (Priority: P2)

A user wants to add a new asset to their collection. They select an image from camera or gallery, choose a category, and submit for analysis. The app navigates to the new asset's detail screen showing Processing state.

**Why this priority**: Adding new assets is core to the collection experience. Without upload, the library has no new content.

**Independent Test**: Can be tested by selecting a test image, choosing a category, submitting, and verifying navigation to detail screen with Processing status.

**Acceptance Scenarios**:

1. **Given** the user is on the upload screen, **When** they tap to select an image, **Then** a picker appears offering camera and gallery options
2. **Given** an image is selected, **When** the user has not yet chosen a category, **Then** the Analyze/Submit button remains disabled
3. **Given** an image and category are selected, **When** the user taps Submit, **Then** the submission starts and a loading indicator appears
4. **Given** submission succeeds, **When** the server responds with the new asset ID, **Then** the app navigates to Asset Detail showing Processing state
5. **Given** an invalid or oversized file is selected, **When** validation runs, **Then** a clear error message is shown and the app does not crash
6. **Given** the user has started upload and tries to navigate back, **When** upload is in progress, **Then** a confirmation prompt asks if they want to abandon the upload

---

### User Story 3 - View Asset Detail with Status-Based Rendering (Priority: P3)

A user taps an asset card to view its details. The detail screen adapts based on asset status—showing full analysis for Ready assets, a processing overlay for Processing assets, an error state with Retry for Failed assets, and appropriate indicators for Partial status.

**Why this priority**: Viewing asset details with AI analysis is the primary value proposition—users want to see brand/model/colorway identification and condition reports.

**Independent Test**: Can be tested by viewing assets in each status state (Ready, Processing, Failed, Partial) and verifying correct UI rendering.

**Acceptance Scenarios**:

1. **Given** an asset with status Ready, **When** the user views detail, **Then** the screen shows: product image, AI analysis (brand/model/colorway with confidence), condition score/report, and asset metadata
2. **Given** an asset with status Processing, **When** the user views detail, **Then** a processing overlay is shown; non-interactive content is appropriately dimmed/disabled
3. **Given** an asset with status Failed, **When** the user views detail, **Then** an error state is displayed with a clear Retry CTA
4. **Given** an asset with status Partial, **When** the user views detail, **Then** a Partial status pill is shown with a brief explanation of what data is available
5. **Given** any asset with both processed and original images, **When** the user toggles Processed/Original, **Then** the displayed image swaps correctly
6. **Given** an asset the user wants to remove, **When** the user selects Archive, **Then** a confirmation appears; on confirm, the asset is archived and UI reflects the change

---

### User Story 4 - Realtime Updates (Priority: P4)

While a user is viewing the library or a detail screen, the app receives realtime updates when asset processing completes. The UI updates automatically without requiring manual refresh.

**Why this priority**: Realtime feedback reduces user friction—they don't need to poll or refresh to see processing results.

**Independent Test**: Can be tested by submitting an asset for processing, waiting on library/detail, and verifying automatic UI update when processing completes.

**Acceptance Scenarios**:

1. **Given** the user is on Assets Library, **When** an asset completes processing, **Then** that asset's card updates (status pill, image if changed) without manual refresh
2. **Given** the user is on Asset Detail for a Processing asset, **When** processing completes, **Then** the detail screen updates to show Ready state with full analysis
3. **Given** the realtime connection drops, **When** disconnection is detected, **Then** a "Reconnecting…" banner appears
4. **Given** the reconnection banner is shown, **When** connection is restored, **Then** the banner dismisses and missed updates are applied
5. **Given** reconnection fails after multiple attempts, **When** the threshold is exceeded, **Then** display an option for manual reconnect

---

### User Story 5 - Settings and Logout (Priority: P5)

A user accesses settings to view their account info and connection status, or to log out and end their session.

**Why this priority**: Essential for account management but lower priority than core asset workflows.

**Independent Test**: Can be tested by navigating to settings, verifying user email and connection status are displayed, and confirming logout clears session and returns to login.

**Acceptance Scenarios**:

1. **Given** the user navigates to Settings, **When** the screen loads, **Then** the user's email is displayed
2. **Given** the user is on Settings, **When** viewing connection status, **Then** the current realtime connection state (Connected/Disconnected) is shown
3. **Given** the user taps Logout, **When** logout completes, **Then** the session is cleared and the app navigates to the Login screen

---

### Edge Cases

- **Burst realtime events**: If multiple status updates arrive in rapid succession, the app must debounce/merge updates safely to avoid UI thrashing
- **Offline → Online transition**: When connectivity is restored, show a single "Back online" toast rather than spamming multiple reconnection messages
- **Upload abandonment**: If user navigates away during upload, prompt for confirmation; if user confirms abandon, cancel the upload gracefully
- **Token refresh race condition**: If multiple API calls fail with 401 simultaneously, only one refresh should be attempted; others wait for the result
- **Empty states**: Library with no assets shows an appropriate empty state with CTA to upload first asset
- **Large library scrolling**: Ensure smooth 60fps scrolling with lazy image loading and virtualized lists to avoid memory issues

## Requirements *(mandatory)*

### Functional Requirements

**Authentication**
- **FR-001**: System MUST allow users to log in with email and password
- **FR-002**: System MUST allow new users to register with email and password
- **FR-003**: System MUST automatically refresh auth tokens when expired without forcing logout (unless refresh fails)
- **FR-004**: System MUST clear session data on logout and redirect to login screen

**Assets Library**
- **FR-005**: System MUST display user's assets in a scrollable list or grid view
- **FR-006**: System MUST show asset thumbnail, title, and status pill on each card
- **FR-007**: System MUST support filtering by category (horizontal scrollable chips or bottom sheet)
- **FR-008**: System MUST support filtering by status (Draft, Processing, Ready, Failed, Partial, Archived)
- **FR-009**: System MUST support text search across assets
- **FR-010**: System MUST support pagination or infinite scroll for large collections
- **FR-011**: System MUST display skeleton UI during initial load

**Upload & Analyze**
- **FR-012**: System MUST allow image selection from device camera
- **FR-013**: System MUST allow image selection from device gallery/photo library
- **FR-014**: System MUST require category selection before submission
- **FR-015**: System MUST disable Submit button until image and category are selected
- **FR-016**: System MUST validate file type and size (max 10 MB) before upload, displaying clear error for invalid files
- **FR-017**: System MUST navigate to Asset Detail with Processing state after successful submission
- **FR-018**: System MUST prompt for confirmation if user attempts to leave during active upload

**Asset Detail**
- **FR-019**: System MUST render detail view based on asset status (Ready, Processing, Failed, Partial, Archived)
- **FR-020**: System MUST display AI analysis (brand, model, colorway, confidence) for Ready assets
- **FR-021**: System MUST display condition score and report for Ready assets
- **FR-022**: System MUST display asset metadata for all assets
- **FR-023**: System MUST show processing overlay with progress indicator for Processing assets
- **FR-024**: System MUST show error state with Retry CTA for Failed assets
- **FR-025**: System MUST show Partial status indicator with explanation when analysis is incomplete
- **FR-026**: System MUST provide Processed/Original image toggle when both versions are available
- **FR-027**: System MUST allow archiving assets with confirmation prompt

**Realtime Updates**
- **FR-028**: System MUST update asset status and metadata in realtime without manual refresh
- **FR-029**: System MUST display "Reconnecting…" banner when realtime connection is lost
- **FR-030**: System MUST automatically attempt reconnection with exponential backoff
- **FR-031**: System MUST provide manual reconnect option after connection failure threshold
- **FR-032**: System MUST debounce rapid successive updates to prevent UI thrashing

**Settings & Session**
- **FR-033**: System MUST display user email in settings
- **FR-034**: System MUST display realtime connection status (Connected/Disconnected)
- **FR-035**: System MUST provide logout functionality

**Mobile UX Adaptation**
- **FR-036**: Navigation MUST use bottom tabs for primary sections (Library, Upload, Settings)
- **FR-037**: Secondary navigation MUST use stack-based screens
- **FR-038**: Primary CTAs MUST be placed in thumb-zone (bottom sticky button or FAB)
- **FR-039**: Filters MUST be accessible via bottom sheet or horizontal chips
- **FR-040**: All interactive elements MUST have minimum 44pt tap targets

**Accessibility & Quality**
- **FR-041**: All interactive elements MUST have accessible labels for screen readers
- **FR-042**: Focus order MUST follow logical reading order
- **FR-043**: System MUST display offline banner when network is unavailable
- **FR-044**: Toast notifications MUST auto-dismiss for success/info; persist with dismiss action for errors

### Key Entities

- **User**: Authenticated account holder with email; maintains session state and owns assets
- **Asset**: A collectible item with: image(s), status (Draft/Processing/Ready/Failed/Partial/Archived), AI analysis results (brand, model, colorway, confidence), condition report, metadata (title, category, timestamps)
- **Category**: Classification label for organizing assets; used in filters and upload flow
- **Status**: Lifecycle state of an asset determining what data is available and how the UI renders

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Core Functionality**
- **SC-001**: Users can complete login and reach Assets Library in under 10 seconds (from app launch)
- **SC-002**: Users can upload a new asset and reach Asset Detail in under 30 seconds (excluding processing time)
- **SC-003**: 95% of users successfully complete their first upload on first attempt without errors

**Performance**
- **SC-004**: Library scrolling maintains smooth 60fps with 500+ assets loaded via virtualization
- **SC-005**: Images in the library load progressively—thumbnails visible within 1 second of scroll position
- **SC-006**: Asset Detail screen renders initial content within 2 seconds of navigation

**Realtime Experience**
- **SC-007**: Status updates appear on library/detail screens within 3 seconds of server-side completion
- **SC-008**: Reconnection after network interruption succeeds within 10 seconds for transient disconnects

**UX Parity**
- **SC-009**: Mobile users can perform all MVP actions (login, register, browse, filter, upload, view detail, archive) that web users can
- **SC-010**: Status pill colors and terminology match exactly between web and mobile
- **SC-011**: Existing web users report the mobile app "feels familiar" in usability testing

**Accessibility & Quality**
- **SC-012**: All interactive elements are reachable via screen reader navigation
- **SC-013**: Primary CTAs (Upload, Submit, Retry) are reachable one-handed in thumb zone
- **SC-014**: Error states provide actionable recovery options in 100% of failure scenarios

## Clarifications

### Session 2026-02-10

- Q: What minimum mobile OS versions should be supported? → A: iOS 15+ and Android 10+ (API 29+)
- Q: What is the maximum file size allowed for asset image uploads? → A: 10 MB per image

## Assumptions

- The existing server API supports all required operations (auth, assets CRUD, realtime subscriptions)
- Brand design tokens (colors, typography, spacing) are documented and available for mobile implementation
- The realtime infrastructure (WebSocket/similar) is already in place from web implementation
- Device camera and gallery permissions follow standard mobile OS permission flows
- Auth tokens follow standard JWT/refresh token patterns already implemented for web

## Constraints

- **Platform Support**: iOS 15+ and Android 10+ (API 29+) — provides modern permission APIs and navigation gestures with ~95% device coverage
- **Upload File Size**: Maximum 10 MB per image — ensures faster uploads on mobile networks; high-resolution photos may need compression
