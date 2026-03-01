/**
 * Token Store
 *
 * Secure storage for authentication tokens.
 * - Native (iOS/Android): uses expo-secure-store (encrypted keychain/keystore)
 * - Web: falls back to localStorage (SecureStore has no web implementation)
 *
 * Access token is kept in memory for performance; refresh token is stored securely.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'kollector_access_token',
  REFRESH_TOKEN: 'kollector_refresh_token',
  USER_DATA: 'kollector_user_data',
};

// ── Platform-aware storage primitives ────────────────────────
const isWeb = Platform.OS === 'web';

async function storageSet(key, value) {
  if (isWeb) {
    try { localStorage.setItem(key, value); } catch (e) {
      console.error('localStorage.setItem failed:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function storageGet(key) {
  if (isWeb) {
    try { return localStorage.getItem(key); } catch (e) {
      console.error('localStorage.getItem failed:', e);
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function storageDelete(key) {
  if (isWeb) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// In-memory cache for quick access token retrieval
let accessTokenCache = null;

/**
 * Store access token
 * @param {string} token
 */
export async function setAccessToken(token) {
  accessTokenCache = token;
  await storageSet(KEYS.ACCESS_TOKEN, token);
}

/**
 * Get access token (from memory cache first, then secure store)
 * @returns {Promise<string | null>}
 */
export async function getAccessToken() {
  if (accessTokenCache) {
    return accessTokenCache;
  }
  
  try {
    const token = await storageGet(KEYS.ACCESS_TOKEN);
    accessTokenCache = token;
    return token;
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Store refresh token securely
 * @param {string} token
 */
export async function setRefreshToken(token) {
  await storageSet(KEYS.REFRESH_TOKEN, token);
}

/**
 * Get refresh token
 * @returns {Promise<string | null>}
 */
export async function getRefreshToken() {
  try {
    return await storageGet(KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Store user data
 * @param {Object} userData
 */
export async function setUserData(userData) {
  await storageSet(KEYS.USER_DATA, JSON.stringify(userData));
}

/**
 * Get user data
 * @returns {Promise<Object | null>}
 */
export async function getUserData() {
  try {
    const data = await storageGet(KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Clear all stored tokens and data (used on logout)
 */
export async function clearAllTokens() {
  accessTokenCache = null;
  
  try {
    await Promise.all([
      storageDelete(KEYS.ACCESS_TOKEN),
      storageDelete(KEYS.REFRESH_TOKEN),
      storageDelete(KEYS.USER_DATA),
    ]);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

/**
 * Check if tokens exist (for initial auth check)
 * @returns {Promise<boolean>}
 */
export async function hasStoredTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);
  return !!(accessToken || refreshToken);
}

export default {
  setAccessToken,
  getAccessToken,
  setRefreshToken,
  getRefreshToken,
  setUserData,
  getUserData,
  clearAllTokens,
  hasStoredTokens,
};
