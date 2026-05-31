import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { buildVipUpgradeReference } from '../config/vipUpgrade';

const STORAGE_KEY = 'kollector_vip_upgrade_session';
export const VIP_UPGRADE_REFERENCE_TTL_MS = 15 * 60 * 1000;
export const VIP_UPGRADE_REFRESH_COOLDOWN_MS = 30 * 1000;

const isWeb = Platform.OS === 'web';

async function setStoredValue(key, value) {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStoredValue(key) {
  if (isWeb) {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStoredValue(key) {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

function buildSession(now = Date.now()) {
  return {
    reference: buildVipUpgradeReference(),
    createdAt: now,
    expiresAt: now + VIP_UPGRADE_REFERENCE_TTL_MS,
    lastRefreshedAt: now,
  };
}

function isSessionValid(session, now = Date.now()) {
  return Boolean(
    session?.reference
    && Number.isFinite(session?.expiresAt)
    && session.expiresAt > now
  );
}

export async function loadVipUpgradeSession(now = Date.now()) {
  try {
    const raw = await getStoredValue(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!isSessionValid(parsed, now)) {
      await deleteStoredValue(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveVipUpgradeSession(session) {
  await setStoredValue(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export async function getOrCreateVipUpgradeSession(now = Date.now()) {
  const existing = await loadVipUpgradeSession(now);
  if (existing) {
    return existing;
  }

  const next = buildSession(now);
  await saveVipUpgradeSession(next);
  return next;
}

export async function refreshVipUpgradeSession(now = Date.now()) {
  const existing = await getOrCreateVipUpgradeSession(now);
  const nextAllowedRefreshAt = existing.lastRefreshedAt + VIP_UPGRADE_REFRESH_COOLDOWN_MS;

  if (now < nextAllowedRefreshAt) {
    return {
      session: existing,
      refreshed: false,
      retryAfterMs: nextAllowedRefreshAt - now,
    };
  }

  const next = {
    ...buildSession(now),
    lastRefreshedAt: now,
  };

  await saveVipUpgradeSession(next);

  return {
    session: next,
    refreshed: true,
    retryAfterMs: 0,
  };
}

export async function clearVipUpgradeSession() {
  await deleteStoredValue(STORAGE_KEY);
}
