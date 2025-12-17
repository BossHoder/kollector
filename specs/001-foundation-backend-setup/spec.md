# Feature Specification: Foundation Backend Setup

**Feature Branch**: `001-foundation-backend-setup`  
**Created**: 2025-12-17  
**Status**: Draft  
**Input**: User description: "Foundation phase based on the Master Plan. Requirements: 1. Connect MongoDB. 2. Implement User Model (with Gamification fields) and Asset Model (with visualLayers & health) exactly as defined in MASTER_PLAN.md. 3. Create Auth Module (Register/Login) with JWT. 4. Create Asset Module (Basic CRUD)."

## Clarifications

### Session 2025-12-17
- Q: What is the JWT token strategy (expiry and refresh)? → A: Access token 15 minutes + refresh token 7 days via `/api/auth/refresh`.
- Q: How are tokens delivered/stored? → A: Refresh in HTTP-only Secure cookie; access in Authorization header.
- Q: How should mobile handle the refresh token? → A: Web uses cookie; Mobile receives refresh token in response body and stores in secure device storage.
- Q: How does the server determine client platform? → A: Clients send `X-Client-Platform: web|mobile` header.
- Q: How should asset listing be paginated and sorted? → A: Cursor-based pagination with `limit` param and `nextCursor` tokens.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Registration (Priority: P1)

A new user wants to create an account to start using KLECTR for managing their collectibles. They provide their email and password to register, and receive confirmation that their account was created successfully.

**Why this priority**: Registration is the entry point for all users. Without the ability to create accounts, no other functionality is accessible. This is the foundation of user identity in the system.

**Independent Test**: Can be fully tested by submitting registration form data and verifying account creation response. Delivers the ability for new users to onboard.

**Acceptance Scenarios**:

1. **Given** no existing account with email "collector@example.com", **When** user submits registration with valid email and password, **Then** account is created and user receives success confirmation with authentication token
2. **Given** an existing account with email "collector@example.com", **When** user attempts to register with the same email, **Then** system returns an error indicating email is already in use
3. **Given** user submits registration, **When** password does not meet minimum requirements (8+ characters), **Then** system returns validation error

---

### User Story 2 - Returning User Login (Priority: P1)

A registered user wants to log in to access their collection. They provide their email and password, and upon successful authentication, receive access to their account.

**Why this priority**: Login is equally critical as registration - returning users must be able to access their data. Authentication is the gateway to all protected functionality.

**Independent Test**: Can be fully tested by submitting valid credentials and verifying token-based authentication response. Delivers secure access for returning users.

**Acceptance Scenarios**:

1. **Given** a registered user with email "collector@example.com" and correct password, **When** user submits login credentials, **Then** system returns authentication token and user profile data
2. **Given** a registered user, **When** user submits incorrect password, **Then** system returns authentication error without revealing whether email exists
3. **Given** a non-existent email, **When** user attempts login, **Then** system returns authentication error without revealing whether email exists

---

### User Story 3 - Add New Collectible Asset (Priority: P2)

An authenticated user wants to add a new collectible item to their vault. They provide the item category (sneaker, lego, camera, or other) and basic information. The system creates a draft asset ready for future AI processing.

**Why this priority**: Asset creation is the core value proposition - users need to be able to add items to their collection. This depends on authentication being in place first.

**Independent Test**: Can be fully tested by creating an asset via API and verifying it appears in the user's collection. Delivers the ability to start building a collection.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** user submits a new asset with category "sneaker", **Then** system creates draft asset with initial health of 100 and returns asset details
2. **Given** an authenticated user, **When** user submits an asset with invalid category, **Then** system returns validation error listing valid categories
3. **Given** an unauthenticated request, **When** attempting to create an asset, **Then** system returns 401 unauthorized error

---

### User Story 4 - View Collection (Priority: P2)

An authenticated user wants to see all their collectible items. They can view a list of their assets with key information like category, status, and health.

**Why this priority**: Users need to see what they've added to manage their collection effectively. This is essential for any subsequent interactions with assets.

**Independent Test**: Can be fully tested by querying the assets endpoint and verifying response contains user's items. Delivers visibility into the user's collection.

**Acceptance Scenarios**:

1. **Given** an authenticated user with 3 assets, **When** user requests their asset list, **Then** system returns all 3 assets with their details
2. **Given** an authenticated user with no assets, **When** user requests their asset list, **Then** system returns an empty list
3. **Given** two different users with separate assets, **When** user A requests their list, **Then** system returns only user A's assets (not user B's)

---

### User Story 5 - View Single Asset Details (Priority: P3)

An authenticated user wants to view detailed information about a specific collectible in their vault, including its health status and visual layer state.

**Why this priority**: Detail views are important for understanding individual items but depend on having assets created first.

**Independent Test**: Can be fully tested by requesting a specific asset by ID and verifying complete details are returned.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an asset, **When** user requests that asset by ID, **Then** system returns complete asset details including condition and visual layers
2. **Given** an authenticated user, **When** user requests an asset ID that doesn't exist, **Then** system returns 404 not found
3. **Given** an authenticated user, **When** user requests another user's asset, **Then** system returns 404 not found (ownership check)

---

### User Story 6 - Update Asset Information (Priority: P3)

An authenticated user wants to update information about an existing collectible, such as correcting the category or updating metadata.

**Why this priority**: Updates are useful but not critical for initial functionality.

**Independent Test**: Can be fully tested by modifying an asset and verifying changes persist.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an asset, **When** user updates the asset's category, **Then** system saves changes and returns updated asset
2. **Given** an authenticated user, **When** user attempts to update another user's asset, **Then** system returns 403 forbidden

---

### User Story 7 - Delete Asset (Priority: P3)

An authenticated user wants to remove a collectible from their vault permanently.

**Why this priority**: Deletion is important for collection management but is lower priority than creation and viewing.

**Independent Test**: Can be fully tested by deleting an asset and verifying it no longer appears in the collection.

**Acceptance Scenarios**:

1. **Given** an authenticated user with an asset, **When** user deletes the asset, **Then** system removes it and returns success confirmation
2. **Given** an authenticated user, **When** user attempts to delete another user's asset, **Then** system returns 403 forbidden

---

### Edge Cases

- What happens when user's authentication token expires? System returns 401 with clear message to re-authenticate
- How does system handle concurrent asset creation from same user? Each request creates a separate asset with unique ID
- What happens when database connection is unavailable? System returns 503 service unavailable with appropriate error message
- How does system handle malformed JSON in request body? System returns 400 bad request with validation details
- What happens when asset health value is provided outside 0-100 range? System enforces bounds (clamped to valid range)

## Requirements *(mandatory)*

### Functional Requirements

**API Standards**
- **FR-000**: All API error responses MUST follow the standard format: `{ "error": { "code": "STRING_CODE", "message": "Human readable message", "details": { ...optional } } }`
- **FR-000a**: All list endpoints MUST use cursor-based pagination where the `cursor` is a Base64-encoded string containing the sort field value (e.g., `createdAt`) and the unique ID (`_id`) of the last item.

**Database Connectivity**
- **FR-001**: System MUST establish and maintain connection to MongoDB database on startup
- **FR-002**: System MUST gracefully handle database connection failures with appropriate error responses
- **FR-003**: System MUST validate all data against defined schemas before persistence

**User Model**
- **FR-004**: System MUST store user accounts with email (unique) and securely hashed password
- **FR-005**: System MUST initialize new users with default gamification data: totalXp=0, rank="Bronze", totalNetWorth=0, maintenanceStreak=0
- **FR-006**: System MUST store user notification preferences: pushEnabled and maintenanceReminders settings

**Asset Model**
- **FR-007**: System MUST store assets linked to their owner (user)
- **FR-008**: System MUST enforce valid asset categories: sneaker, lego, camera, other
- **FR-009**: System MUST enforce valid asset statuses: draft, processing, active, archived
- **FR-010**: System MUST initialize new assets with default condition: health=100, decayRate=2
- **FR-011**: System MUST support storage of image references (original, processed, card variants)
- **FR-012**: System MUST support storage of AI-generated metadata (brand, model with confidence scores)
- **FR-013**: System MUST support visual layer effects for gamification display (dust_light, dust_medium, dust_heavy with intensity)
- **FR-014**: System MUST support NFC tag association with assets
- **FR-015**: System MUST support market data storage (estimated value, price deviation)

**Authentication Module**
- **FR-016**: System MUST allow new user registration with email and password
- **FR-017**: System MUST validate email format during registration
- **FR-018**: System MUST enforce minimum password strength (8+ characters)
- **FR-019**: System MUST securely hash passwords before storage (never store plaintext)
- **FR-020**: System MUST prevent duplicate email registrations
- **FR-021**: System MUST authenticate users via email and password login
- **FR-022**: System MUST issue a short-lived access token (15 minutes) and a refresh token (7 days) upon successful authentication
- **FR-022a**: System MUST expose `POST /api/auth/refresh` to exchange a valid refresh token for a new access token
- **FR-022b**: Refresh token MUST be set as an HTTP-only, Secure cookie (SameSite=Lax) for web clients; access token MUST be used via `Authorization: Bearer <token>` header
- **FR-022c**: For mobile clients, the refresh token MUST be returned in the JSON response body and clients MUST store it in secure device storage; no cookie is required for mobile
- **FR-022d**: Clients MUST include header `X-Client-Platform` with value `web` or `mobile`. When `web`, server sets refresh token cookie; when `mobile`, server returns refresh token in body. If absent, default to `web`.
- **FR-023**: System MUST validate JWT tokens on protected routes
- **FR-024**: System MUST return consistent error messages that don't reveal whether an email exists (security)

**Asset Module (CRUD)**
- **FR-025**: System MUST allow authenticated users to create new assets
- **FR-026**: System MUST allow authenticated users to list their own assets
- **FR-026a**: Asset listing MUST use cursor-based pagination via query params `cursor` (Base64 encoded `createdAt` + `_id`) and `limit` (default 20, max 100)
- **FR-026b**: List response MUST include `items` array and `nextCursor` when more results are available; omit `nextCursor` when last page
- **FR-026c**: Asset listing MUST be ordered by `createdAt` descending with `_id` as a tiebreaker to ensure stable pagination
- **FR-026d**: Filters (`category`, `status`) MUST be compatible with cursor pagination and applied consistently across pages
- **FR-027**: System MUST allow authenticated users to view details of their own assets
- **FR-028**: System MUST allow authenticated users to update their own assets
- **FR-029**: System MUST allow authenticated users to delete their own assets
- **FR-030**: System MUST prevent users from accessing, modifying, or deleting other users' assets
- **FR-031**: System MUST support filtering assets by category and status

### Key Entities

- **User**: Represents a registered collector with authentication credentials, gamification progress (XP, rank, net worth, maintenance streak), and notification preferences
- **Asset**: Represents a collectible item owned by a user, with category classification, status lifecycle, image references, AI-extracted metadata, health/condition tracking for gamification, and optional NFC/market data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration in under 30 seconds with immediate access to their account
- **SC-002**: Login authentication completes in under 2 seconds
- **SC-003**: Asset creation, update, and deletion operations complete in under 1 second
- **SC-004**: System returns appropriate error messages for all validation failures within 500ms
- **SC-005**: 100% of protected endpoints reject unauthenticated requests
- **SC-006**: 100% of user data access is properly scoped to the authenticated user only
- **SC-007**: All user passwords are stored securely (never retrievable in plaintext)
- **SC-008**: New assets initialize with correct default values (health=100, rank="Bronze" for users)

## Assumptions

- MongoDB is available and accessible via connection string from environment configuration
- JWT secret and token expiration settings are provided via environment configuration
- Email validation is format-based only (no email verification/confirmation flow in this phase)
- Password requirements are minimum 8 characters (additional complexity rules may be added later)
- Asset images are stored externally (Cloudinary) - this phase only stores URL references
- AI processing, gamification decay, and real-time events are out of scope for this foundation phase
- The server will use Express.js following the modular monolith architecture defined in the constitution
