import type { SubscriptionStatusData, UpgradeRequestSummary } from './subscription';
import type { User } from './user';

export interface AdminOverviewResponse {
  data: {
    pendingVipRequests: number;
    activeVipUsers: number;
    queue: {
      waiting: number;
      active: number;
    };
    failedJobsCount: number;
    lastRefreshedAt: string;
  };
}

export interface AdminUserSearchResult {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status?: 'active' | 'suspended' | 'deleted';
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  lastLoginAt: string | null;
  subscription: {
    tier: 'free' | 'vip';
    status: 'active' | 'grace_pending_renewal' | 'expired';
    expiresAt: string | null;
    graceEndsAt: string | null;
  } | null;
}

export interface AdminUserListResponse {
  data: {
    items: AdminUserSearchResult[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface AdminUserSummaryResponse {
  data: {
    user: User;
    subscription: SubscriptionStatusData;
    recentUpgradeRequests: UpgradeRequestSummary[];
  };
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface AdminQueueStatusResponse {
  data: {
    aiProcessing: QueueMetrics;
    assetEnhancement: QueueMetrics;
    enhancementAck: {
      accepted: number;
      conflicts: number;
      failures: number;
      lastAckDurationMs: number;
      lastAcceptedAt: string | null;
    };
    lastRefreshedAt: string;
  };
}

export interface AdminFailedJob {
  id: string;
  queueName: string;
  assetId: string | null;
  userId: string | null;
  failureReason: string;
  attemptsMade: number;
  maxAttempts: number;
  createdAt: string | null;
  processedAt: string | null;
  failedAt: string | null;
}

export interface AdminFailedJobsResponse {
  data: AdminFailedJob[];
}
