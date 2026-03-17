const { version } = require('./package.json');

const DEFAULT_EXPO_OWNER = 'theanhdola';
const DEFAULT_EXPO_PROJECT_ID = 'ae00bd17-3de2-440e-80b6-18d5cb6d0f0c';

const APP_VARIANT = process.env.APP_VARIANT || 'production';
const EXPO_OWNER = process.env.EXPO_OWNER || DEFAULT_EXPO_OWNER;
const EXPO_PROJECT_ID = process.env.EXPO_PROJECT_ID || DEFAULT_EXPO_PROJECT_ID;
const EXPO_ANDROID_PACKAGE = process.env.EXPO_ANDROID_PACKAGE || 'com.thetr.kollector';
const EXPO_IOS_BUNDLE_IDENTIFIER = process.env.EXPO_IOS_BUNDLE_IDENTIFIER || 'com.thetr.kollector';
const EXPO_PUBLIC_API_URL = trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL || '');
const EXPO_PUBLIC_SOCKET_URL = trimTrailingSlash(process.env.EXPO_PUBLIC_SOCKET_URL || '');

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function variantSuffix(variant) {
  switch (variant) {
    case 'development':
      return '.dev';
    case 'preview':
      return '.preview';
    default:
      return '';
  }
}

function appName(variant) {
  switch (variant) {
    case 'development':
      return 'Kollector Dev';
    case 'preview':
      return 'Kollector Preview';
    default:
      return 'Kollector';
  }
}

function applyIdentifierSuffix(identifier, suffix) {
  return suffix ? `${identifier}${suffix}` : identifier;
}

function isLocalOnlyUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?(\/|$)/i.test(value);
}

function assertProductionUrl(label, value) {
  if (!value) {
    throw new Error(`${label} must be set for production mobile builds.`);
  }

  if (isLocalOnlyUrl(value)) {
    throw new Error(`${label} cannot point to localhost or a private LAN address for production mobile builds.`);
  }
}

if (APP_VARIANT === 'production') {
  assertProductionUrl('EXPO_PUBLIC_API_URL', EXPO_PUBLIC_API_URL);
  assertProductionUrl('EXPO_PUBLIC_SOCKET_URL', EXPO_PUBLIC_SOCKET_URL);
}

const identifierSuffix = variantSuffix(APP_VARIANT);
const extra = {
  appVariant: APP_VARIANT,
  apiUrl: EXPO_PUBLIC_API_URL || null,
  socketUrl: EXPO_PUBLIC_SOCKET_URL || null,
};

if (EXPO_PROJECT_ID) {
  extra.eas = { projectId: EXPO_PROJECT_ID };
}

const expoConfig = {
  name: appName(APP_VARIANT),
  slug: 'kollector-mobile',
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'kollector',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  jsEngine: 'hermes',
  assetBundlePatterns: ['**/*'],
  runtimeVersion: {
    policy: 'appVersion',
  },
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: applyIdentifierSuffix(EXPO_IOS_BUNDLE_IDENTIFIER, identifierSuffix),
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription: 'Allow Kollector to take photos of your collectibles.',
      NSPhotoLibraryUsageDescription: 'Allow Kollector to choose photos of your collectibles.',
      NSPhotoLibraryAddUsageDescription: 'Allow Kollector to save processed collectible images.',
    },
  },
  android: {
    package: applyIdentifierSuffix(EXPO_ANDROID_PACKAGE, identifierSuffix),
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Kollector to take photos of your collectibles.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow Kollector to choose photos of your collectibles.',
        cameraPermission: 'Allow Kollector to take photos of your collectibles.',
      },
    ],
    [
      'expo-secure-store',
      {
        configureAndroidBackup: false,
      },
    ],
  ],
  web: {
    favicon: './assets/favicon.png',
  },
  extra,
};

if (EXPO_OWNER) {
  expoConfig.owner = EXPO_OWNER;
}

module.exports = {
  expo: expoConfig,
};
