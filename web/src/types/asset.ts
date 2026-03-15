/**
 * Asset types
 * Source: assets.openapi.json
 */

export type AssetCategory = string;
export type AssetStatus = 'draft' | 'processing' | 'partial' | 'active' | 'archived' | 'failed';

export interface AssetImages {
  original?: {
    url: string;
    publicId?: string;
    uploadedAt?: string;
  };
  processed?: {
    url: string;
    publicId?: string;
  };
  thumbnail?: {
    url: string;
    publicId?: string;
  };
  card?: {
    url: string;
  };
}

export interface ConfidenceValue {
  value: string;
  confidence: number; // 0-1
}

export interface AIMetadata {
  brand?: ConfidenceValue;
  model?: ConfidenceValue;
  colorway?: ConfidenceValue;
  estimatedYear?: ConfidenceValue;
  conditionNotes?: string;
  rawResponse?: string;
  processedAt?: string;
  // Extended fields used by UI
  description?: string;
  condition?: ConfidenceValue;
  authenticity?: ConfidenceValue;
  estimatedValue?: {
    min: number;
    max: number;
    currency: string;
  };
  tags?: string[];
  error?: string;
}

export interface AssetCondition {
  health: number; // 0-100
  decayRate: number;
  lastDecayDate?: string;
  lastMaintenanceDate?: string; // ISO 8601
  maintenanceCount?: number;
}

export interface VisualLayer {
  type: 'dust_light' | 'dust_medium' | 'dust_heavy' | 'yellowing' | 'scratches';
  intensity: number;
  appliedAt?: string;
}

export interface Asset {
  id?: string;
  _id?: string; // MongoDB ObjectId alias
  userId: string;
  category: AssetCategory;
  status: AssetStatus;
  images?: AssetImages;
  aiMetadata?: AIMetadata;
  condition?: AssetCondition;
  visualLayers?: VisualLayer[];
  createdAt?: string;
  updatedAt?: string;
  details?: {
    brand?: string;
    model?: string;
  };
  // Extended fields used by UI
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  originalImageUrl?: string;
  processedImageUrl?: string;
  originalFilename?: string;
  fileSizeMB?: number;
  fileSizeBytes?: number;
  mimeType?: string;
  uploadedAt?: string;
  error?: string;
}
