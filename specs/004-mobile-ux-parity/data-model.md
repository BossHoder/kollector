# Data Model: Mobile UX Parity (Web -> Mobile)

**Feature**: [spec.md](spec.md)
**Contracts**: [contracts/](contracts/)
**Date**: 2026-03-10

## Entities

### 1) User

Represents an authenticated account owner.

Core fields:
- `id: string`
- `email: string`

Client session fields (non-persistent in MongoDB):
- `accessToken: string`
- `refreshToken: string`
- `connectionState: connected|connecting|reconnecting|disconnected`

### 2) CategoryCanonical

Canonical server-aligned category domain.

Fields:
- `key: 'sneaker' | 'lego' | 'camera' | 'other'`
- `labelVi: string`
- `labelEn?: string`

### 3) CategoryAliasMap

Compatibility mapping for legacy/client terms.

Fields:
- `alias: string`
- `canonical: CategoryCanonical.key`
- `source: web|mobile|legacy`

Examples:
- `shoes -> sneaker`
- `photography -> camera`
- `collectible -> other`

### 4) Asset (Server-backed)

Primary persisted collectible entity.

Identity and ownership:
- `id: string`
- `userId: string`

Classification and lifecycle:
- `category: CategoryCanonical.key`
- `status: 'draft' | 'processing' | 'partial' | 'active' | 'archived' | 'failed'`

Images:
- `images.original.url: string`
- `images.processed.url?: string`
- `images.thumbnail.url?: string`

File metadata (required for immediate detail display):
- `originalFilename?: string`
- `fileSizeMB?: number`
- `mimeType?: string`
- `uploadedAt?: string (ISO)`

AI metadata:
- `aiMetadata.brand?: { value: string, confidence: number }`
- `aiMetadata.model?: { value: string, confidence: number }`
- `aiMetadata.colorway?: { value: string, confidence: number }`
- `aiMetadata.error?: string`
- `aiMetadata.processedAt?: string`

Timestamps:
- `createdAt: string`
- `updatedAt: string`

### 5) LocalUploadDraft (Client-only)

Represents local placeholder records when upload flow fails after user intent is established.

Fields:
- `localId: string`
- `userId: string`
- `imageUri: string`
- `category: CategoryCanonical.key`
- `status: 'pending_upload' | 'failed_upload'`
- `errorMessage?: string`
- `retryCount: number`
- `createdAt: string`
- `updatedAt: string`

Sync fields:
- `serverAssetId?: string`
- `syncState: local_only | syncing | synced`

## Relationships

- `User 1..* Asset`
- `User 1..* LocalUploadDraft`
- `Asset 1..1 CategoryCanonical`
- `CategoryAliasMap *..1 CategoryCanonical`

## Validation Rules

### Category validation
- Incoming category from UI must be normalized through `CategoryAliasMap`.
- If no mapping exists, use filter fallback behavior:
  - list filters: omit `category` query (All)
  - upload category selection: block submit until canonical category selected

### Upload validation
- File type must be image MIME supported by app (`jpeg`, `png`, `webp`, `heic`, `heif`).
- File size must be `<= 10 MB`.
- Submit requires both image and canonical category.

### Status rendering validation
- UI label mapping:
  - `active -> Ready`
  - `processing -> Processing`
  - `failed -> Failed`
  - `partial -> Partial`
  - `archived -> Archived`
  - `draft -> Draft`

### Metadata rendering validation
- Detail screen must display file metadata from upload payload even while `status=processing`.
- Missing metadata should render explicit placeholder (`-`) but must not suppress available fields.

## State Transitions

### Server asset lifecycle
- `draft -> processing` (submit analyze queue)
- `processing -> active` (AI success)
- `processing -> partial` (AI partial)
- `processing -> failed` (AI failure)
- `active|partial|failed|draft -> archived` (archive action)

### Client local upload lifecycle
- `pending_upload -> syncing` (retry/submit starts)
- `syncing -> synced` (server returns asset id; draft replaced by server asset)
- `syncing -> failed_upload` (request/network/camera-related failure)
- `failed_upload -> syncing` (manual retry)

## Realtime + Polling Consistency Model

Event:
- Socket event `asset_processed` updates asset status and metadata.

Fallback:
- If socket disconnected, poll list/detail every 10-15s.
- When socket reconnects, stop fallback polling.

Merge rule:
- For same asset, apply update with newest `updatedAt`/event `timestamp`.
- Prefer socket event when timestamps are equal.

Dedup rule:
- Ignore duplicate events with same `(assetId, timestamp, status)`.
