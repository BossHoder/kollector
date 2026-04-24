# Data Model: FE MVP Integration

**Feature**: 010-fe-mvp-integration  
**Date**: 2025-12-30  
**Purpose**: Define FE TypeScript types derived from BE OpenAPI contracts

## Source Contracts

All types are derived from existing backend contracts:
- `specs/001-foundation-backend-setup/contracts/auth.openapi.json`
- `specs/001-foundation-backend-setup/contracts/assets.openapi.json`
- `specs/002-ai-queue-pipeline/contracts/analyze-queue.openapi.json`
- `specs/002-ai-queue-pipeline/contracts/asset-processed-event.schema.json`

## Entity Types

### User

```typescript
// Source: auth.openapi.json#/components/schemas/UserPublic
interface User {
  id: string;
  email: string;
  gamification?: {
    totalXp: number;
    rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    totalNetWorth: number;
    maintenanceStreak: number;
  };
}
```

### Asset

```typescript
// Source: assets.openapi.json#/components/schemas/Asset
type AssetCategory = 'sneaker' | 'lego' | 'camera' | 'other';
type AssetStatus = 'draft' | 'processing' | 'partial' | 'active' | 'archived';

interface AssetImages {
  original?: {
    url: string;
    publicId: string;
  };
  processed?: {
    url: string;
    publicId: string;
  };
  card?: {
    url: string;
  };
}

interface ConfidenceValue {
  value: string;
  confidence: number; // 0-1
}

interface AIMetadata {
  brand?: ConfidenceValue;
  model?: ConfidenceValue;
  colorway?: ConfidenceValue;
  rawResponse?: string;
}

interface AssetCondition {
  health: number; // 0-100
  decayRate: number;
  lastMaintenanceDate?: string; // ISO 8601
}

interface VisualLayer {
  type: 'dust_light' | 'dust_medium' | 'dust_heavy';
  intensity: number;
}

interface Asset {
  id: string;
  userId: string;
  category: AssetCategory;
  status: AssetStatus;
  images?: AssetImages;
  aiMetadata?: AIMetadata;
  condition?: AssetCondition;
  visualLayers?: VisualLayer[];
  createdAt?: string;
  updatedAt?: string;
}
```

### Socket Events

```typescript
// Source: asset-processed-event.schema.json

interface AssetProcessedSuccessEvent {
  event: 'asset_processed';
  assetId: string;
  status: 'active';
  aiMetadata: {
    brand: ConfidenceValue;
    model: ConfidenceValue;
    colorway?: ConfidenceValue;
  };
  processedImageUrl?: string;
  timestamp: string; // ISO 8601
}

interface AssetProcessedFailureEvent {
  event: 'asset_processed';
  assetId: string;
  status: 'failed';
  error: string;
  timestamp: string; // ISO 8601
}

type AssetProcessedEvent = AssetProcessedSuccessEvent | AssetProcessedFailureEvent;
```

## API Request/Response Types

### Auth

```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// POST /api/auth/register
interface RegisterRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  user: User;
  accessToken: string;
}

// POST /api/auth/refresh
interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}
```

### Assets

```typescript
// GET /api/assets
interface ListAssetsParams {
  cursor?: string;
  limit?: number; // 1-100, default 20
  category?: AssetCategory;
  status?: AssetStatus;
}

interface ListAssetsResponse {
  items: Asset[];
  nextCursor: string | null;
}

// GET /api/assets/:id
type GetAssetResponse = Asset;

// POST /api/assets/analyze-queue
// Request: multipart/form-data with image (File) and category (string)
interface AnalyzeQueueResponse {
  success: true;
  data: {
    assetId: string;
    jobId: string;
    status: 'processing';
    message: string;
  };
}
```

### Error Responses

```typescript
// Standard error response structure
interface ErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}
```

## FE-Only Types (Not from BE)

### UI State

```typescript
// Auth context state
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Socket context state
type SocketStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface SocketState {
  status: SocketStatus;
  error?: string;
}

// Toast notification
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // success/info: 3000ms, error: null (persistent)
  dismissible: boolean; // true for error, optional for others
}
```

### Status Display Mapping

```typescript
// Map BE status to UI display properties
interface StatusDisplayConfig {
  label: string;
  labelVi: string;
  color: 'primary' | 'emerald' | 'red' | 'gray' | 'orange';
  icon: string;
  animated?: boolean;
}

const STATUS_DISPLAY: Record<AssetStatus | 'failed', StatusDisplayConfig> = {
  draft: {
    label: 'Draft',
    labelVi: 'Bản nháp',
    color: 'gray',
    icon: 'edit',
  },
  processing: {
    label: 'Processing',
    labelVi: 'Đang xử lý',
    color: 'primary',
    icon: 'auto_awesome',
    animated: true,
  },
  partial: {
    label: 'Partial',
    labelVi: 'Chưa hoàn chỉnh',
    color: 'orange',
    icon: 'warning',
  },
  active: {
    label: 'Ready',
    labelVi: 'Sẵn sàng',
    color: 'emerald',
    icon: 'check_circle',
  },
  archived: {
    label: 'Archived',
    labelVi: 'Đã lưu trữ',
    color: 'gray',
    icon: 'archive',
  },
  failed: {
    label: 'Failed',
    labelVi: 'Thất bại',
    color: 'red',
    icon: 'error',
  },
};
```

## Relationships

```
User 1:N Asset (userId)
Asset 1:1 AIMetadata (embedded)
Asset 1:1 AssetCondition (embedded)
Asset 1:N VisualLayer (embedded array)
Asset 1:1 AssetImages (embedded)
```

## Validation Rules

### Login/Register Forms

| Field | Rules | Error Message |
|-------|-------|---------------|
| email | Required, valid email format | "Email không hợp lệ" |
| password | Required, min 8 characters | "Mật khẩu phải có ít nhất 8 ký tự" |
| confirmPassword | Must match password (register) | "Mật khẩu không khớp" |

### Upload Form

| Field | Rules | Error Message |
|-------|-------|---------------|
| image | Required, image/*, max 10MB | "Vui lòng chọn ảnh" / "Kích thước tệp quá lớn" |
| category | Required, one of enum values | "Vui lòng chọn danh mục" |

## Notes

1. **`failed` status**: The `failed` status appears in socket events but may not be persisted in Asset.status. FE should handle both cases.

2. **Images optional**: Asset.images may be null/undefined for newly created assets before processing completes.

3. **AIMetadata confidence**: Confidence values are 0-1 (0% to 100%). Multiply by 100 for display.

4. **Timestamps**: All timestamps are ISO 8601 format. Use native Date parsing or date-fns for formatting.
