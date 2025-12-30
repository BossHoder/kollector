# Data Model: AI Queue Pipeline

**Feature**: 002-ai-queue-pipeline  
**Date**: 2025-12-28  
**Source**: [spec.md](spec.md) Key Entities + [research.md](research.md)

## Overview

This feature does not introduce new MongoDB collections. It leverages existing models and introduces queue-based entities (BullMQ jobs) that are managed in Redis.

---

## Entities

### 1. Asset (Existing Model - Extended)

**Collection**: `assets`  
**Status**: Existing model, requires status enum extension

#### Schema Extension

```javascript
// models/Asset.js - Status enum update
status: { 
  type: String, 
  enum: ['draft', 'processing', 'partial', 'active', 'archived', 'failed'],  // Added 'failed'
  default: 'draft',
  index: true
}
```

#### Fields Used by This Feature

| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Asset identifier (passed to queue job) |
| `userId` | ObjectId | Owner reference (for event routing) |
| `status` | String | Lifecycle state: draft → processing → active/failed |
| `images.original.url` | String | Source image URL for AI processing |
| `images.processed.url` | String | Background-removed image (set by worker) |
| `aiMetadata` | Object | AI extraction results (set by worker) |
| `aiMetadata.brand` | { value, confidence } | Detected brand |
| `aiMetadata.model` | { value, confidence } | Detected model |
| `aiMetadata.colorway` | { value, confidence } | Detected colorway |
| `aiMetadata.processedAt` | Date | When AI processing completed |
| `aiMetadata.error` | String | Error message if processing failed |
| `processingJobId` | String | BullMQ job ID reference |

#### Status Transitions (This Feature)

```
[New Asset Created] → draft → processing → active (success)
                                        ↘ failed (terminal failure)
```

---

### 2. AI Processing Job (Redis/BullMQ)

**Queue**: `ai-processing`  
**Storage**: Redis (managed by BullMQ)  
**Lifecycle**: waiting → active → completed/failed

#### Job Data Schema

```javascript
{
  // Identifiers
  assetId: String,      // MongoDB ObjectId as string
  userId: String,       // For event routing
  
  // Processing input
  imageUrl: String,     // Cloudinary URL of original image
  category: String,     // Asset category for AI context
  
  // Metadata
  createdAt: String,    // ISO timestamp
  attempt: Number       // Current attempt number (managed by BullMQ)
}
```

#### Job Options

| Option | Value | Description |
|--------|-------|-------------|
| `attempts` | 3 | Maximum retry attempts |
| `backoff.type` | exponential | Backoff strategy |
| `backoff.delay` | 2000 | Base delay in ms (2s, 4s, 8s) |
| `timeout` | 120000 | Job timeout in ms (2 minutes) |
| `removeOnComplete.age` | 86400 | Remove completed after 24h |
| `removeOnFail.age` | 604800 | Remove failed after 7 days |

#### Job States

| State | Description |
|-------|-------------|
| `waiting` | Job queued, not yet picked up |
| `active` | Worker is processing |
| `completed` | Successfully processed |
| `failed` | All retries exhausted, moved to DLQ |
| `delayed` | Waiting for retry backoff |

---

### 3. Socket Connection (In-Memory)

**Storage**: In-memory (Socket.io server state)  
**Lifecycle**: Connected → Authenticated → Joined Room → Disconnected

#### Connection State

| Property | Type | Description |
|----------|------|-------------|
| `socket.id` | String | Unique socket identifier |
| `socket.userId` | String | Authenticated user ID (from JWT) |
| `rooms` | Set | Rooms socket has joined (includes `user:<userId>`) |

#### Room Naming Convention

```
user:<userId>  →  e.g., user:507f1f77bcf86cd799439011
```

All sockets for the same authenticated user join the same room.

---

### 4. Socket Event Payloads

#### `asset_processed` Event

Emitted to `user:<userId>` room when processing completes.

**Success Payload**:
```javascript
{
  event: 'asset_processed',
  assetId: '507f1f77bcf86cd799439011',
  status: 'active',
  aiMetadata: {
    brand: { value: 'Nike', confidence: 0.95 },
    model: { value: 'Air Jordan 1', confidence: 0.88 },
    colorway: { value: 'Chicago', confidence: 0.82 }
  },
  processedImageUrl: 'https://res.cloudinary.com/.../processed.png',
  timestamp: '2025-12-28T10:30:00.000Z'
}
```

**Failure Payload**:
```javascript
{
  event: 'asset_processed',
  assetId: '507f1f77bcf86cd799439011',
  status: 'failed',
  error: 'AI service unavailable after 3 attempts',
  timestamp: '2025-12-28T10:30:00.000Z'
}
```

---

## Relationships

```
┌─────────────┐         ┌─────────────────┐
│    User     │ 1────n  │      Asset      │
└─────────────┘         └─────────────────┘
       │                        │
       │                        │ 1:1 (processingJobId)
       │                        ▼
       │                ┌─────────────────┐
       │                │   BullMQ Job    │
       │                │ (ai-processing) │
       │                └─────────────────┘
       │
       │ 1:n (socket connections)
       ▼
┌─────────────────┐
│ Socket.io Room  │
│ user:<userId>   │
└─────────────────┘
```

---

## Validation Rules

### Asset Creation (analyze-queue endpoint)

| Field | Rule |
|-------|------|
| `category` | Required, one of: `sneaker`, `lego`, `camera`, `other` |
| `image` | Required, file upload, max 10MB, image/* MIME type |

### Job Data

| Field | Rule |
|-------|------|
| `assetId` | Required, valid MongoDB ObjectId |
| `userId` | Required, valid MongoDB ObjectId |
| `imageUrl` | Required, valid HTTPS URL |
| `category` | Required, valid category enum value |

---

## Indexes

No new indexes required. Existing indexes on `Asset` are sufficient:

- `userId` (existing) - for ownership queries
- `status` (existing) - for filtering by status
- `processingJobId` (sparse) - already exists for job lookup
