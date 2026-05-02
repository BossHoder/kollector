import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import type { SocketStatus } from '@/lib/socket';
import { apiClient, ApiError } from '@/lib/api-client';
import { ASSET_THEME_PRESETS } from '@/lib/assetThemePresets';
import {
  createUpgradeRequest,
  getSubscriptionStatus,
  listUpgradeRequests,
} from '@/lib/subscriptionApi';
import { SubscriptionStateBadge } from '@/components/subscription/SubscriptionStateBadge';

function getStatusText(status: SocketStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting...';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'disconnected':
      return 'Disconnected';
    case 'error':
      return 'Connection error';
    default:
      return 'Unknown';
  }
}

function getStatusColorClass(status: SocketStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-stitch-green';
    case 'connecting':
    case 'reconnecting':
      return 'bg-stitch-yellow';
    case 'disconnected':
    case 'error':
      return 'bg-stitch-red';
    default:
      return 'bg-gray-500';
  }
}

type StoredThemeUser = {
  settings?: {
    preferences?: {
      assetTheme?: {
        defaultThemeId?: string | null;
      };
    };
  };
};

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { status } = useSocket();
  const navigate = useNavigate();
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(
    ((user as unknown as StoredThemeUser)?.settings?.preferences?.assetTheme?.defaultThemeId) ?? null
  );
  const [requestType, setRequestType] = useState<'upgrade' | 'renewal'>('upgrade');
  const [transferReference, setTransferReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: getSubscriptionStatus,
  });
  const requestsQuery = useQuery({
    queryKey: ['subscription-upgrade-requests'],
    queryFn: listUpgradeRequests,
  });

  const themeMutation = useMutation({
    mutationFn: async (themeId: string | null) => apiClient.patch('/api/auth/me', {
      settings: {
        preferences: {
          assetTheme: {
            defaultThemeId: themeId,
          },
        },
      },
    }),
    onSuccess: (_data, themeId) => {
      setSelectedThemeId(themeId);
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) {
        throw new Error('Proof image is required');
      }

      return createUpgradeRequest({
        type: requestType,
        transferReference,
        proofFile,
      });
    },
    onSuccess: async () => {
      setTransferReference('');
      setProofFile(null);
      await requestsQuery.refetch();
      await subscriptionQuery.refetch();
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const subscription = subscriptionQuery.data?.data;
  const requests = requestsQuery.data?.data ?? [];
  const lockedPresetIds = subscription?.entitlements.theme.lockedPresetIds ?? [];
  const selectedThemeName = useMemo(
    () => ASSET_THEME_PRESETS.find((preset) => preset.id === selectedThemeId)?.name || 'System fallback',
    [selectedThemeId]
  );
  const nextResetText = subscription?.usage.nextResetAt
    ? new Date(subscription.usage.nextResetAt).toLocaleDateString('en-US')
    : null;
  const themeError = themeMutation.error instanceof ApiError ? themeMutation.error.message : null;
  const requestError = requestMutation.error instanceof Error ? requestMutation.error.message : null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-stitch-blue hover:text-stitch-blue-dark transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to library
        </Link>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-stitch-navy">Settings</h1>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stitch-navy">Subscription</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tier, quota, expiry, and renewal state.
            </p>
          </div>
          {subscription ? <SubscriptionStateBadge status={subscription.status} /> : null}
        </div>

        {subscription ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Tier</p>
              <p className="mt-2 text-2xl font-semibold text-stitch-navy">{subscription.tier.toUpperCase()}</p>
              <p className="mt-2 text-sm text-gray-600">
                Assets: {subscription.usage.assetUsed}/{subscription.usage.assetLimit}
              </p>
              <p className="text-sm text-gray-600">
                Processing: {subscription.usage.processingUsed}/{subscription.usage.processingLimit}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Next reset</p>
              <p className="mt-2 text-2xl font-semibold text-stitch-navy">
                {nextResetText || 'UTC monthly'}
              </p>
              {subscription.graceEndsAt ? (
                <p className="mt-2 text-sm text-amber-700">
                  Grace ends {new Date(subscription.graceEndsAt).toLocaleString('en-US')}
                </p>
              ) : null}
              {subscription.expiresAt ? (
                <p className="mt-2 text-sm text-gray-600">
                  Expires {new Date(subscription.expiresAt).toLocaleString('en-US')}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Loading subscription status...</p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stitch-navy">Default Asset Theme</h2>
        <p className="mb-4 text-sm text-gray-600">Current default: {selectedThemeName}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ASSET_THEME_PRESETS.filter((preset) => preset.active).map((preset) => {
            const locked = lockedPresetIds.includes(preset.id);
            const selected = selectedThemeId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => void themeMutation.mutateAsync(preset.id)}
                disabled={themeMutation.isPending || locked}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-stitch-blue bg-stitch-blue/5'
                    : 'border-gray-200 hover:border-stitch-blue/40'
                } ${locked ? 'cursor-not-allowed opacity-55' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-stitch-navy">{preset.name}</span>
                  {locked ? <span className="text-xs font-semibold uppercase text-amber-700">VIP</span> : null}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {locked ? 'Locked for Free tier.' : 'Available now.'}
                </p>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void themeMutation.mutateAsync(null)}
          disabled={themeMutation.isPending}
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-stitch-blue/40"
        >
          Clear default theme
        </button>
        {themeError ? <p className="mt-3 text-sm text-amber-700">{themeError}</p> : null}
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stitch-navy">Upgrade Request</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Request type</span>
            <select
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as 'upgrade' | 'renewal')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-stitch-navy"
            >
              <option value="upgrade">Upgrade to VIP</option>
              <option value="renewal">Renew VIP</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Transfer reference</span>
            <input
              value={transferReference}
              onChange={(event) => setTransferReference(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-stitch-navy"
              placeholder="BANK-REF-123"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-600">Proof image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600"
            />
          </label>

          <button
            type="button"
            onClick={() => void requestMutation.mutateAsync()}
            disabled={requestMutation.isPending || !transferReference.trim() || !proofFile}
            className="inline-flex items-center justify-center rounded-lg bg-stitch-blue px-4 py-2 font-medium text-white transition hover:bg-stitch-blue-dark disabled:opacity-60"
          >
            {requestMutation.isPending ? 'Submitting...' : 'Submit bank transfer'}
          </button>
          {requestError ? <p className="text-sm text-amber-700">{requestError}</p> : null}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">Recent requests</h3>
          <div className="mt-3 space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">No upgrade requests yet.</p>
            ) : (
              requests.slice(0, 4).map((request) => (
                <div key={request.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-stitch-navy">
                      {request.type.toUpperCase()} • {request.transferReference}
                    </p>
                    <span className="text-xs font-semibold uppercase text-gray-500">
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Submitted {new Date(request.submittedAt).toLocaleString('en-US')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stitch-navy mb-4">Account</h2>

        <div className="space-y-4">
          {(user?.displayName || user?.username) && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Display name</label>
              <p className="text-stitch-navy">{user.displayName || user.username}</p>
            </div>
          )}

          {user?.email && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-stitch-navy">{user.email}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stitch-navy mb-4">Connection</h2>

        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-3 h-3 rounded-full ${getStatusColorClass(status)}`}
            aria-hidden="true"
          />
          <span className="text-stitch-navy">{getStatusText(status)}</span>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stitch-navy mb-4">Session</h2>
        <p className="text-gray-600 mb-4">Sign out from this device.</p>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-lg bg-stitch-red px-4 py-2 font-medium text-white transition hover:bg-stitch-red/90"
        >
          Log out
        </button>
      </section>
    </div>
  );
}

export default SettingsPage;
