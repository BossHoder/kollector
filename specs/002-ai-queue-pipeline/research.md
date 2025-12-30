# Research: AI Queue Pipeline

**Feature**: 002-ai-queue-pipeline  
**Date**: 2025-12-28  
**Purpose**: Resolve technical unknowns and establish best practices for implementation

## Research Summary

All technical unknowns from the Technical Context have been resolved. This document captures decisions, rationale, and alternatives considered.

---

## 1. BullMQ Queue Configuration

### Decision
Use BullMQ with ioredis connection, configuring:
- Queue name: `ai-processing`
- Default job options: 3 attempts, exponential backoff (base 2000ms)
- Concurrency: 5 jobs per worker instance
- Job timeout: 120 seconds (AI processing can be slow)
- Remove completed jobs after 24 hours, failed after 7 days

### Rationale
- BullMQ is already in package.json and matches MASTER_PLAN tech stack
- Exponential backoff prevents thundering herd on AI service recovery
- 5 concurrent jobs balances throughput vs AI service load
- Retention policy allows debugging without unbounded growth

### Alternatives Considered
- **Agenda.js**: Rejected—MongoDB-based, adds latency; Redis is already in stack
- **Bull (v3)**: Rejected—BullMQ is the maintained successor with better TypeScript support
- **Custom Redis pub/sub**: Rejected—reinventing reliable queue semantics

### Code Pattern
```javascript
// config/redis.js
const Redis = require('ioredis');
const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null // Required for BullMQ
});

// modules/assets/assets.queue.js
const { Queue, Worker } = require('bullmq');
const aiQueue = new Queue('ai-processing', { connection });

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 24 * 3600 },
  removeOnFail: { age: 7 * 24 * 3600 }
};
```

---

## 2. Socket.io Integration with Express

### Decision
- Attach Socket.io to the same HTTP server as Express
- Use `auth.token` in handshake for JWT authentication
- Join authenticated users to room `user:<userId>`
- Emit `asset_processed` to user room from worker via shared Redis adapter

### Rationale
- Single port simplifies deployment and CORS
- Per-user rooms prevent cross-user event leakage
- Redis adapter allows worker process to emit events even if running separately

### Alternatives Considered
- **Separate WebSocket port**: Rejected—complicates firewall/proxy config
- **Polling fallback only**: Rejected—Socket.io handles this automatically
- **Server-Sent Events (SSE)**: Rejected—less flexible for bidirectional future needs

### Code Pattern
```javascript
// config/socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*', credentials: true } });
  
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.sub;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });
  
  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });
  
  return io;
}
```

---

## 3. Multipart File Upload Handling

### Decision
- Use Multer middleware for `multipart/form-data`
- Store uploaded images to Cloudinary (per MASTER_PLAN)
- Pass Cloudinary URL to queue job (worker fetches from URL)
- Limit file size to 10MB, accept image/* MIME types

### Rationale
- Multer is the standard Express middleware for multipart
- Cloudinary handles CDN, transformations, and persistence
- Passing URL (not binary) keeps queue payloads small and serializable

### Alternatives Considered
- **Store to local disk**: Rejected—not scalable, complicates Docker deployment
- **Pass base64 in job**: Rejected—bloats Redis memory, slow serialization
- **Direct S3 upload**: Rejected—Cloudinary already in stack for image processing

### Code Pattern
```javascript
// middleware/upload.middleware.js
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});
```

---

## 4. Worker-to-API Communication (Event Emission)

### Decision
- Worker runs in same process as Express/Socket.io for MVP
- If scaled to separate process, use BullMQ's built-in events + Redis pub/sub
- Worker calls `io.to(`user:${userId}`).emit('asset_processed', payload)`

### Rationale
- Same-process is simplest; avoids additional IPC complexity
- BullMQ events provide job lifecycle hooks for future scaling
- Direct Socket.io emit is reliable when io instance is shared

### Alternatives Considered
- **HTTP callback to API**: Rejected—adds latency and failure modes
- **Redis pub/sub separate channel**: Rejected—BullMQ events already use Redis
- **Separate worker process from start**: Rejected—premature optimization; add when needed

### Code Pattern
```javascript
// workers/ai.worker.js
const { Worker } = require('bullmq');
const { getIO } = require('../config/socket');

new Worker('ai-processing', async (job) => {
  const { assetId, userId, imageUrl } = job.data;
  // ... call AI service, update asset ...
  
  getIO().to(`user:${userId}`).emit('asset_processed', {
    assetId,
    status: 'active',
    aiMetadata: result
  });
}, { connection });
```

---

## 5. AI Service Integration

### Decision
- AI worker (Python FastAPI) exposes `POST /analyze` endpoint
- Node.js worker calls via HTTP with `{ imageUrl, category }`
- Response contains `{ brand, model, colorway, confidence }` fields
- Timeout: 90 seconds per request

### Rationale
- HTTP is simple, debuggable, and matches existing ai-worker structure
- JSON contract is explicit and versionable
- 90s timeout accommodates model loading on cold start

### Alternatives Considered
- **gRPC**: Rejected—adds protobuf complexity for simple JSON payloads
- **Message queue (AI listens)**: Rejected—HTTP is simpler for request/response
- **Direct Python import**: Rejected—violates modular monolith boundaries

### AI Service Contract (Expected)
```json
// Request: POST /analyze
{
  "imageUrl": "https://res.cloudinary.com/.../image.jpg",
  "category": "sneaker"
}

// Response: 200 OK
{
  "brand": { "value": "Nike", "confidence": 0.95 },
  "model": { "value": "Air Jordan 1", "confidence": 0.88 },
  "colorway": { "value": "Chicago", "confidence": 0.82 },
  "processedImageUrl": "https://res.cloudinary.com/.../processed.png"
}
```

---

## 6. Error Handling & Dead Letter Queue

### Decision
- BullMQ automatically moves jobs to DLQ after max attempts
- Failed jobs retain full payload for debugging
- Asset status set to `failed` with error message in `aiMetadata.error`
- Emit `asset_processed` with `status: 'failed'` for client notification

### Rationale
- BullMQ's built-in DLQ is reliable and queryable
- Preserving payload enables manual retry/debugging
- Client notification ensures UX doesn't hang indefinitely

### Alternatives Considered
- **Silent failure**: Rejected—poor UX, no visibility
- **Immediate delete on failure**: Rejected—loses debugging information
- **Custom DLQ implementation**: Rejected—BullMQ handles this

---

## 7. Asset Status Lifecycle

### Decision
Add `failed` to Asset status enum: `['draft', 'processing', 'partial', 'active', 'archived', 'failed']`

### Rationale
- Explicit terminal failure state is testable and queryable
- Matches spec clarification (Session 2025-12-18)
- Allows future "retry failed" feature

### Schema Change Required
```javascript
// models/Asset.js - update status enum
status: { 
  type: String, 
  enum: ['draft', 'processing', 'partial', 'active', 'archived', 'failed'], 
  default: 'draft' 
}
```

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://default:xxx@xxx.upstash.io:6379` |
| `CLOUDINARY_URL` | Cloudinary credentials | `cloudinary://key:secret@cloud` |
| `AI_SERVICE_URL` | Python AI worker base URL | `http://localhost:8000` |
| `JWT_SECRET` | JWT signing secret | (existing) |

---

## Dependencies to Add

None—all required packages already in `package.json`:
- `bullmq`: ^5.66.0 ✓
- `ioredis`: ^5.8.2 ✓
- `socket.io`: ^4.8.1 ✓

New dependency needed:
- `multer`: ^1.4.5 (for multipart uploads)
- `cloudinary`: ^2.x (for image upload to CDN)

```bash
npm install multer cloudinary
```
