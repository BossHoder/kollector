# Data Model: Foundation Backend Setup

**Feature**: `001-foundation-backend-setup`  
**Source**: `MASTER_PLAN.md` and `specs/001-foundation-backend-setup/spec.md`

## Entities

### 1. User

Represents a registered collector.

**Fields**
- `email`: String, unique, required
- `passwordHash`: String, required (hashed with Argon2)
- `gamification.totalXp`: Number, required, default 0
- `gamification.rank`: String, enum [`Bronze`, `Silver`, `Gold`, `Platinum`, `Diamond`], default `Bronze`
- `gamification.totalNetWorth`: Number, required, default 0
- `gamification.maintenanceStreak`: Number, required, default 0
- `settings.notifications.pushEnabled`: Boolean, default true
- `settings.notifications.maintenanceReminders`: Boolean, default true

**Relationships**
- One `User` → Many `Asset` documents (via `Asset.userId`)

**Validation Rules**
- `email` must be a valid email format and unique across users
- `passwordHash` must never be returned to clients
- `gamification.rank` must always be one of the allowed enum values
- Numeric gamification fields must be non-negative

---

### 2. Asset

Represents a collectible item owned by a user.

**Fields**
- `userId`: ObjectId (ref `User`), required
- `category`: String, enum [`sneaker`, `lego`, `camera`, `other`], required
- `status`: String, enum [`draft`, `processing`, `active`, `archived`], required

**Images**
- `images.original.url`: String, optional
- `images.original.publicId`: String, optional
- `images.processed.url`: String, optional
- `images.processed.publicId`: String, optional
- `images.card.url`: String, optional

**AI Data**
- `aiMetadata.brand.value`: String, optional
- `aiMetadata.brand.confidence`: Number, optional
- `aiMetadata.model.value`: String, optional
- `aiMetadata.model.confidence`: Number, optional
- `aiMetadata.rawResponse`: String, optional (serialized JSON/text)

**Tamagotchi Logic**
- `condition.health`: Number, default 100, range 0–100
- `condition.decayRate`: Number, default 2 (percent per day)
- `condition.lastMaintenanceDate`: Date, optional

**Visual Effects**
- `visualLayers[]`: Array of objects
  - `visualLayers[].type`: String, enum [`dust_light`, `dust_medium`, `dust_heavy`]
  - `visualLayers[].intensity`: Number, range 0–100 (integer)

**Features**
- `nfc.tagId`: String, optional
- `marketData.estimatedValue`: Number, optional
- `marketData.priceDeviation`: Number, optional

**Relationships**
- Many `Asset` → One `User` (owner)
- Future: Many `MaintenanceLog` → One `Asset`

**Validation Rules**
- `category` and `status` must always be in their enums
- `condition.health` must be clamped to 0–100
- `visualLayers[].type` must be a valid enum value when present

---

### 3. MaintenanceLog (Out-of-scope for this phase)

Defined in MASTER_PLAN but not implemented in this foundation feature.

**Fields (for future reference)**
- `assetId`: ObjectId (ref `Asset`)
- `userId`: ObjectId (ref `User`)
- `action`: String, enum [`clean`, `decay`]
- `previousHealth`: Number
- `newHealth`: Number
- `xpAwarded`: Number
- `performedAt`: Date

This entity is documented here to keep the data model coherent but will not be created or persisted in this phase.
