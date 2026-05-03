import { apiRequest } from '../services/apiClient';
import type {
  UpgradeRequestListResponse,
  UpgradeRequestResponse,
  UpgradeRequestType,
  SubscriptionStatusResponse,
} from '../types/subscription';

export interface CreateUpgradeRequestInput {
  type: UpgradeRequestType;
  transferReference: string;
  amount?: number;
  currency?: string;
  bankLabel?: string;
  payerMask?: string;
  proofFile?: {
    storageUrl?: string;
    uploadedAt?: string;
  } | null;
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
  if (!String(input.transferReference || '').trim()) {
    throw new Error('Vui lòng nhập mã tham chiếu chuyển khoản.');
  }

  return apiRequest('/subscription/upgrade-requests', {
    method: 'POST',
    body: {
      type: input.type,
      transferReference: input.transferReference.trim(),
      amount: input.amount,
      currency: input.currency,
      bankLabel: input.bankLabel,
      payerMask: input.payerMask,
      proofFile: input.proofFile ?? null,
    },
  });
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
