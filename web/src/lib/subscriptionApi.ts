import { apiClient } from './api-client';
import type {
  AdminDecisionInput,
  CreateUpgradeRequestInput,
  SubscriptionStatusResponse,
  UpgradeRequestListResponse,
  UpgradeRequestResponse,
} from '@/types/subscription';

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  return apiClient.get<SubscriptionStatusResponse>('/api/subscription/me');
}

export async function listUpgradeRequests(): Promise<UpgradeRequestListResponse> {
  return apiClient.get<UpgradeRequestListResponse>('/api/subscription/upgrade-requests');
}

export async function getUpgradeRequest(requestId: string): Promise<UpgradeRequestResponse> {
  return apiClient.get<UpgradeRequestResponse>(`/api/subscription/upgrade-requests/${requestId}`);
}

export async function createUpgradeRequest(
  input: CreateUpgradeRequestInput
): Promise<UpgradeRequestResponse> {
  const formData = new FormData();
  formData.append('type', input.type);
  formData.append('transferReference', input.transferReference);
  formData.append('proofFile', input.proofFile);

  if (input.amount !== undefined) {
    formData.append('amount', String(input.amount));
  }

  if (input.currency) {
    formData.append('currency', input.currency);
  }

  return apiClient.upload<UpgradeRequestResponse>('/api/subscription/upgrade-requests', formData);
}

export async function adminListUpgradeRequests(
  status?: 'pending' | 'approved' | 'rejected' | 'expired'
): Promise<UpgradeRequestListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiClient.get<UpgradeRequestListResponse>(`/api/admin/subscription/upgrade-requests${query}`);
}

export async function adminApproveUpgradeRequest(
  requestId: string,
  payload: AdminDecisionInput = {}
): Promise<UpgradeRequestResponse> {
  return apiClient.post<UpgradeRequestResponse>(
    `/api/admin/subscription/upgrade-requests/${requestId}/approve`,
    payload
  );
}

export async function adminRejectUpgradeRequest(
  requestId: string,
  payload: AdminDecisionInput
): Promise<UpgradeRequestResponse> {
  return apiClient.post<UpgradeRequestResponse>(
    `/api/admin/subscription/upgrade-requests/${requestId}/reject`,
    payload
  );
}

export default {
  adminApproveUpgradeRequest,
  adminListUpgradeRequests,
  adminRejectUpgradeRequest,
  createUpgradeRequest,
  getSubscriptionStatus,
  getUpgradeRequest,
  listUpgradeRequests,
};
