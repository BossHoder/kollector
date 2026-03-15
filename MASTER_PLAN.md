# MASTER PLAN: THE COLLECTOR'S VAULT (KLECTR)

## 1. PROJECT OVERVIEW

- **Name:** KLECTR (The Collector's Vault)
- **Type:** Personal Asset Management with Gamification (Tamagotchi-style).
- **Core Concept:** Users manage collectibles (Sneakers, Lego, Cameras). Items decay over time; users must "clean" them physically on the screen to restore health.

## 2. TECH STACK (STRICT)

- **Architecture:** Modular Monolith (Node.js) + Satellite AI Service (Python).
- **Backend:** Node.js (Express/NestJS), MongoDB (Mongoose), Redis (BullMQ), Socket.io.
- **AI Worker:** Python (FastAPI), RMBG-1.4 (Background Removal), Moondream2 (Vision LLM).
- **Mobile:** React Native (Expo), **@shopify/react-native-skia** (Visual Effects), Expo Haptics.
- **Infrastructure:** Docker, Hugging Face Spaces (AI), Upstash (Redis), Cloudinary (Images).

## 3. SYSTEM ARCHITECTURE

### Data Flow (AI Ingestion)

1. **Mobile:** Upload image -> POST `/api/assets/analyze-queue`.
2. **Node.js:** Save draft Asset -> Push job to Redis Queue `ai-processing`.
3. **Python Worker:** Poll Job -> Download Img -> Remove BG -> Extract Metadata -> Return Result.
4. **Node.js:** Update DB -> Emit Socket Event `asset_processed`.
5. **Mobile:** Listen event -> Show result.

### Data Flow (Gamification)

1. **Cron Job (Daily):** Reduce `condition.health` by 2%. Update `visualLayers` (dust).
2. **Mobile:** Render Dust Overlay (Skia) based on `visualLayers`.
3. **User Action:** Pan Gesture to "clean" -> Call POST `/maintain`.

## 4. DATABASE SCHEMA (MONGODB)

### User Collection

```javascript
{
  email: String,
  passwordHash: String,
  gamification: {
    totalXp: Number,
    rank: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] },
    totalNetWorth: Number,
    maintenanceStreak: Number
  },
  settings: {
    notifications: { pushEnabled: Boolean, maintenanceReminders: Boolean }
  }
}
```
### Asset Collection (Core)
```javascript
{
  userId: ObjectId,
  category: { type: String, enum: ['sneaker', 'lego', 'camera', 'other'] },
  status: { type: String, enum: ['draft', 'processing', 'active', 'archived'] },
  
  // Images
  images: {
    original: { url: String, publicId: String },
    processed: { url: String, publicId: String }, // Transparent BG
    card: { url: String } // FIFA Card
  },

  // AI Data
  aiMetadata: {
    brand: { value: String, confidence: Number },
    model: { value: String, confidence: Number },
    rawResponse: String
  },

  // Tamagotchi Logic
  condition: {
    health: { type: Number, default: 100 }, // 0-100
    decayRate: { type: Number, default: 2 }, // 2% per day
    lastMaintenanceDate: Date
  },
  
  // Visual Effects (Skia)
  visualLayers: [{
    type: { type: String, enum: ['dust_light', 'dust_medium', 'dust_heavy'] },
    intensity: Number
  }],

  // Features
  nfc: { tagId: String },
  marketData: { estimatedValue: Number, priceDeviation: Number }
}
```
### MaintenanceLog Collection
```javascript
{
  assetId: ObjectId,
  userId: ObjectId,
  action: { type: String, enum: ['clean', 'decay'] },
  previousHealth: Number,
  newHealth: Number,
  xpAwarded: Number,
  performedAt: Date
}
```
## 5. API SPECIFICATION

### Auth Module

- `POST /api/auth/register`

- `POST /api/auth/login`

### Asset Module

- `POST /api/assets/analyze-queue` (Start AI Process)

- `GET /api/assets` (List with filters)

- `GET /api/assets/:id` (Detail)

- `POST /api/assets/:id/maintain` (Clean item, restore health)

- `POST /api/assets/:id/link-nfc`

- `POST /api/assets/:id/generate-card`

## 6. IMPLEMENTATION PHASES (ROADMAP)

Phase 1: Backend Foundation
- Setup Express, MongoDB connection.
- Implement User & Asset Schemas (as defined above).
- Basic CRUD APIs (No AI yet).

Phase 2: AI Queue Pipeline
- Setup Redis & BullMQ.
- Implement `asset.queue.js` (Producer) and `ai.worker.js` (Consumer).
- Setup Python Service on Hugging Face.
- Integrate Socket.io for realtime updates.

Phase 3: Mobile Base
- Setup Expo Router.
- Build Home Screen (Masonry List) & Detail Screen.
- Integrate Auth (JWT storage).

Phase 4: Mobile Camera & Realtime
- Implement Camera Screen.
- Connect to `/analyze-queue`.
- Listen to Socket events to auto-refresh UI.

Phase 5: Gamification (The Soul)
- Implement Decay Cron Job (Node.js).
- Build Skia "Dust Layer" & Cleaning Gesture (Mobile).
- Connect Cleaning action to `/maintain` API.

## 7. RULES & CONSTRAINTS

- No Hallucinations: Only use fields defined in Schema.
- Modular Code: Keep Controllers, Services, and Models separated.
- Async First: Always use Queue for heavy tasks (Image processing).
- Security: Always use `auth.middleware.js` for protected routes.

## 8. CROSS-APP PARITY NOTE (011-MOBILE-UX-PARITY)

- Canonical category contract is `sneaker|lego|camera|other` across server/web/mobile.
- Client aliases must normalize to canonical values before query/submission; invalid values fall back to All by omitting category.
- Mobile upload failures after image selection must create local placeholder records with retry actions.
- Asset detail must show file metadata (filename, size, mime, uploaded time) immediately, including while processing.
- Realtime uses Socket.io first with automatic 10-15s polling fallback during disconnect.

## 9. ROLLOUT SUMMARY (011-MOBILE-UX-PARITY)

- Category/status contract alignment is now enforced across spec, server, web, and mobile by test coverage.
- Mobile upload flow preserves user intent on failure using local pending placeholders and explicit retry actions.
- Asset detail screens render metadata as soon as upload returns, including processing states.
- Mobile library now supports status + category filter parity with web behavior and invalid-category fallback to All.
- Realtime behavior uses WebSocket primary updates with polling fallback to maintain freshness during disconnects.

Rollout checkpoints:
- Validate API and Socket URLs in mobile environment settings before release.
- Monitor API 400 volume for category/status filters after deploy.
- Track retry success ratio for failed camera/gallery upload attempts.
- Confirm reconnect banner and fallback polling events in production telemetry.

