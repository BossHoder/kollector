export type SubscriptionTier = 'free' | 'vip';

export type SubscriptionStatus = 'active' | 'grace_pending_renewal' | 'expired';

export type UpgradeRequestType = 'upgrade' | 'renewal';

export type UpgradeRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ThemeEntitlement {
  selectablePresetIds: string[];
  lockedPresetIds: string[];
  freeDefinition?: {
    defaultPresetId: string;
    lightPresetId: string;
  };
}

export interface TierEntitlements {
  assetLimit: number;
  processingMonthlyLimit: number;
  maintenanceExpMultiplier: number;
  priceUsdMonthly: number | null;
  theme: ThemeEntitlement;
}

export interface UsageStatus {
  processingUsed: number;
  processingLimit: number;
  processingRemaining: number;
  nextResetAt: string;
  assetUsed: number;
  assetLimit: number;
}

export interface SubscriptionStatusData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  effectiveAt: string;
  expiresAt: string | null;
  graceEndsAt: string | null;
  entitlements: TierEntitlements;
  usage: UsageStatus;
}

export interface SubscriptionStatusResponse {
  data: SubscriptionStatusData;
}

export interface UpgradeRequestSummary {
  id: string;
  userId: string;
  type: UpgradeRequestType;
  status: UpgradeRequestStatus;
  transferReference: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  proofFileDeleteAt: string | null;
  metadataExpireAt: string;
}

export interface UpgradeRequestResponse {
  data: UpgradeRequestSummary;
}

export interface UpgradeRequestListResponse {
  data: UpgradeRequestSummary[];
}
