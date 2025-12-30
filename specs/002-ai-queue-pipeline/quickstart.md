# Quickstart: AI Queue Pipeline

**Feature**: 002-ai-queue-pipeline  
**Date**: 2025-12-28  
**Purpose**: Get the AI processing pipeline running locally for development

## Prerequisites

- Node.js 20.x
- Docker (for Redis)
- MongoDB running locally or connection string
- Cloudinary account (for image uploads)

## 1. Environment Setup

Add these variables to `server/.env`:

```bash
# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Cloudinary (image uploads)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
# Or individual vars:
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Existing (should already be set)
MONGODB_URI=mongodb://localhost:27017/klectr
JWT_SECRET=your_jwt_secret
```

## 2. Start Redis

Using Docker:

```bash
docker run -d --name redis-klectr -p 6379:6379 redis:7-alpine
```

Or use Upstash Redis URL for cloud:

```bash
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379
```

## 3. Install Dependencies

```bash
cd server
npm install multer cloudinary
```

## 4. Start the Server

```bash
cd server
npm run dev
```

Server starts with:
- Express API on `http://localhost:3000`
- Socket.io on same port
- BullMQ worker processing `ai-processing` queue

## 5. Test the Endpoint

### Submit an asset for processing:

```bash
curl -X POST http://localhost:3000/api/assets/analyze-queue \
  -H "Authorization: Bearer <your_jwt_token>" \
  -F "image=@/path/to/sneaker.jpg" \
  -F "category=sneaker"
```

Expected response (202 Accepted):

```json
{
  "success": true,
  "data": {
    "assetId": "507f1f77bcf86cd799439011",
    "jobId": "ai-processing:1",
    "status": "processing",
    "message": "Asset queued for AI analysis"
  }
}
```

### Connect to Socket.io for real-time updates:

```javascript
// Browser or Node.js client
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: { token: '<your_jwt_token>' }
});

socket.on('connect', () => {
  console.log('Connected to Socket.io');
});

socket.on('asset_processed', (data) => {
  console.log('Asset processed:', data);
  // { assetId, status, aiMetadata, ... }
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});
```

## 6. Start AI Service (Optional)

The Python AI worker needs to be running for actual AI processing:

```bash
cd ai-worker
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

For development without AI service, jobs will fail after retries and assets will be marked as `failed`.

## 7. Monitor Queue (Optional)

Use BullMQ's built-in dashboard or query queue programmatically:

```javascript
const { Queue } = require('bullmq');
const queue = new Queue('ai-processing');

// Get queue counts
const counts = await queue.getJobCounts();
console.log(counts);
// { waiting: 0, active: 1, completed: 5, failed: 0, delayed: 0 }
```

## Development Workflow

1. **Submit asset** → POST `/api/assets/analyze-queue` with image
2. **Worker processes** → Calls AI service, updates asset
3. **Event emitted** → `asset_processed` sent to user's Socket.io room
4. **Client updates UI** → Real-time feedback without polling

## Troubleshooting

### Redis connection failed
- Ensure Redis is running: `docker ps | grep redis`
- Check REDIS_URL format: `redis://localhost:6379` or `rediss://` for TLS

### Socket.io auth failed
- Ensure JWT token is valid and not expired
- Check token is passed in `auth: { token }` not headers

### Jobs stuck in waiting
- Verify worker is running (check server logs)
- Check Redis connection in worker process

### AI service timeout
- Default timeout is 90 seconds
- Check AI service logs at `http://localhost:8000/docs`
