import { Platform } from 'react-native';

const defaultApiHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const defaultOrigin = `http://${defaultApiHost}:3000`;

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function isPrivateDevelopmentUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i.test(value);
}

export const API_BASE_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL || `${defaultOrigin}/api`
);

export const SOCKET_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_SOCKET_URL || defaultOrigin
);

export const SHOULD_LIMIT_ANDROID_SOCKET_TRANSPORTS =
  Platform.OS === 'android' && isPrivateDevelopmentUrl(SOCKET_URL);
