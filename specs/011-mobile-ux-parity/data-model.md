# Data Model: Mobile UX Parity (Web → Mobile)

**Feature**: [spec.md](spec.md)  
**Contracts**: see existing backend specs + this feature’s proposed amendments in [contracts/](contracts/)  
**Date**: 2026-02-10

## Entities

### User

Represents an authenticated account.

**Core fields (conceptual)**
- `id`: unique identifier
- `email`: unique email address

**Client session state (not persisted to MongoDB)**
- `accessToken`: short-lived JWT
- `refreshToken`: long-lived refresh token (mobile stores securely)

### Asset

Core collectible item shown in the library and detail screens.

**Identity & ownership**
- `id`
- `userId`

**Classification**
- `category`: `sneaker | lego | camera | other`

**Lifecycle status**
- Backend enum (source of truth, per Mongoose): `draft | processing | partial | active | archived | failed`
- UI display labels (parity requirement):
  - `draft` → Draft
  - `processing` → Processing
  - `active` → Ready
  - `failed` → Failed
  - `partial` → Partial
  - `archived` → Archived

**Images** (matches backend schema shape)
- `images.original.url` (required)
- `images.processed.url` (optional)
- `images.thumbnail.url` (optional)

**AI Analysis**
- `aiMetadata.brand`: `{ value, confidence }`
- `aiMetadata.model`: `{ value, confidence }`
- `aiMetadata.colorway`: `{ value, confidence }` (optional)
- `aiMetadata.processedAt` (optional)

**Condition**
- `condition.health`: number 0–100
- `condition.conditionNotes` (if exposed via `aiMetadata.conditionNotes` or other backend fields)

**Metadata**
- `createdAt`, `updatedAt`
- `details.*` optional manual fields (brand/model/colorway/sku/serialNumber/description/tags)

## Validation Rules (MVP)

### Upload image
- File size MUST be `<= 10 MB` (client-side pre-check; server-side enforcement recommended)
- Source MUST be camera or photo library

### Upload category
- Category MUST be selected before submission
- Category MUST be one of `sneaker | lego | camera | other`

### Asset status rendering
- UI MUST render state-specific sections based on backend status:
  - `processing`: show overlay; disable/dim non-interactive sections
  - `failed`: show error + Retry CTA
  - `partial`: show Partial pill + short explanation
  - `active`: show AI analysis + condition + metadata

## State Transitions

Primary transitions (simplified):
- `draft` → `processing` (after submit to analyze-queue)
- `processing` → `active` (successful processing)
- `processing` → `failed` (processing failure)
- `processing` → `partial` (partial completion)
- `active|failed|partial|draft` → `archived` (archive action)

## Realtime Event Model

### Socket event: `asset_processed`

- Transport: Socket.io to room `user:<userId>`
- Emitted by backend when processing completes

**Payload (success)**
- `assetId`: string
- `status`: `active`
- `aiMetadata`: object (brand/model/colorway)
- `processedImageUrl`: string (optional depending on backend)
- `timestamp`: ISO string

**Payload (failure)**
- `assetId`: string
- `status`: `failed`
- `error`: string
- `timestamp`: ISO string

Client requirements:
- Apply updates to both library list and asset detail without manual refresh
- Debounce/merge burst updates to avoid UI thrash
