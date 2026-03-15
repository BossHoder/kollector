# Data Model: AI Processing Service

**Feature**: `012-ai-processing-service`  
**Date**: 2026-03-15

This feature primarily introduces an **external service contract** (Node worker ↔ Python AI service). Persistent storage remains in the existing MongoDB `Asset` model.

## Existing Persistent Entities (MongoDB)

### Asset (existing)

Relevant fields (already defined in `server/src/models/Asset.js`):

- `status`: enum includes `draft`, `processing`, `partial`, `active`, `archived`, `failed`
- `images.original.url`: source image URL (uploaded by Node server)
- `images.processed.url`: background-removed output URL
- `aiMetadata`:
  - `brand`, `model`, `colorway`: `{ value: string, confidence: number }`
  - `processedAt`: date
  - `error`, `failedAt`: failure details

### Asset status transitions (existing)

- `draft → processing`: when the asset is enqueued for AI processing
- `processing → active`: background removal succeeds and at least one of brand/model/colorway is present
- `processing → partial`: background removal succeeds and all of brand/model/colorway are unknown/empty
- `processing → failed`: only for terminal failures where processing truly cannot complete

## New Contract Entities (AI service)

### AnalyzeRequest (HTTP)

- `image_url: string` (required)
  - Public URL accessible by the AI service (typically Cloudinary URL)
- `category: string` (required)
  - Asset category context (passed through from the queue job)

### AnalyzeResponse (HTTP)

- `processed_image_url: string | null`
  - URL of the background-removed image (transparent PNG recommended)
- `brand: string | { value: string, confidence: number } | null`
- `model: string | { value: string, confidence: number } | null`
- `colorway: string | { value: string, confidence: number } | null`

### ErrorResponse (HTTP)

- Non-2xx indicates an error.
- 5xx indicates retryable server-side failure.

## Derived / Normalized Shapes (Node)

The Node client normalizes AI response values into the `Asset.aiMetadata` schema:

- If a field is a string, it is coerced to `{ value: <string>, confidence: <default> }`.
- If a field is an object `{ value, confidence }`, it is used directly (with defaults if missing).

## Notes

- This feature does not change the existing queue job schema or socket event schema; it supplies the missing AI service needed for the current pipeline to complete.
