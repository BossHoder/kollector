import { apiRequest, uploadFile } from '../services/apiClient';
import type {
  UpgradeRequestListResponse,
  UpgradeRequestResponse,
  UpgradeRequestType,
  SubscriptionStatusResponse,
} from '../types/subscription';

export interface CreateUpgradeRequestInput {
  type: UpgradeRequestType;
  transferReference: string;
  proofFile: Blob | { uri: string; name: string; type: string };
  amount?: number;
  currency?: string;
}

export interface AdminDecisionInput {
  reason?: string;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  return apiRequest('/subscription/me');
}

export async function listUpgradeRequests(): Promise<UpgradeRequestListResponse> {
  return apiRequest('/subscription/upgrade-requests');
}

export async function getUpgradeRequest(requestId: string): Promise<UpgradeRequestResponse> {
  return apiRequest(`/subscription/upgrade-requests/${requestId}`);
}

export async function createUpgradeRequest(
  input: CreateUpgradeRequestInput
): Promise<UpgradeRequestResponse> {
  const formData = new FormData();
  formData.append('type', input.type);
  formData.append('transferReference', input.transferReference);
  formData.append('proofFile', input.proofFile as never);

  if (input.amount !== undefined) {
    formData.append('amount', String(input.amount));
  }

  if (input.currency) {
    formData.append('currency', input.currency);
  }

  return uploadFile('/subscription/upgrade-requests', formData);
}

export async function adminListUpgradeRequests(
  status?: 'pending' | 'approved' | 'rejected' | 'expired'
): Promise<UpgradeRequestListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/admin/subscription/upgrade-requests${query}`);
}

export async function adminApproveUpgradeRequest(
  requestId: string,
  payload: AdminDecisionInput = {}
): Promise<UpgradeRequestResponse> {
  return apiRequest(`/admin/subscription/upgrade-requests/${requestId}/approve`, {
    method: 'POST',
    body: payload,
  });
}

export async function adminRejectUpgradeRequest(
  requestId: string,
  payload: AdminDecisionInput
): Promise<UpgradeRequestResponse> {
  return apiRequest(`/admin/subscription/upgrade-requests/${requestId}/reject`, {
    method: 'POST',
    body: payload,
  });
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
