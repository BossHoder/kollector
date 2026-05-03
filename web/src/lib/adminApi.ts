import { apiClient } from './api-client';
import type {
  AdminFailedJobsResponse,
  AdminUserListResponse,
  AdminOverviewResponse,
  AdminQueueStatusResponse,
  AdminUserSummaryResponse,
} from '@/types/admin';

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  return apiClient.get<AdminOverviewResponse>('/api/admin/overview');
}

export interface ListAdminUsersParams {
  email?: string;
  role?: 'user' | 'admin';
  accountStatus?: 'active' | 'suspended' | 'deleted';
  tier?: 'free' | 'vip' | 'none';
  subscriptionStatus?: 'active' | 'grace_pending_renewal' | 'expired' | 'none';
  page?: number;
  limit?: number;
}

export async function listAdminUsers(
  params: ListAdminUsersParams = {}
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();

  if (params.email) query.set('email', params.email);
  if (params.role) query.set('role', params.role);
  if (params.accountStatus) query.set('accountStatus', params.accountStatus);
  if (params.tier) query.set('tier', params.tier);
  if (params.subscriptionStatus) query.set('subscriptionStatus', params.subscriptionStatus);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiClient.get<AdminUserListResponse>(`/api/admin/users${suffix}`);
}

export async function getAdminUserSummary(userId: string): Promise<AdminUserSummaryResponse> {
  return apiClient.get<AdminUserSummaryResponse>(`/api/admin/users/${userId}`);
}

export async function getAdminQueueStatus(): Promise<AdminQueueStatusResponse> {
  return apiClient.get<AdminQueueStatusResponse>('/api/admin/operations/queue-status');
}

export async function getAdminFailedJobs(limit = 20): Promise<AdminFailedJobsResponse> {
  return apiClient.get<AdminFailedJobsResponse>(`/api/admin/operations/failed-jobs?limit=${limit}`);
}

export default {
  getAdminFailedJobs,
  getAdminOverview,
  getAdminQueueStatus,
  getAdminUserSummary,
  listAdminUsers,
};
