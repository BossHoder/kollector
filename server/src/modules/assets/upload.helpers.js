const path = require('path');
const { serializeAsset } = require('./asset.serializer');

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ASSET_CATEGORIES = ['sneaker', 'lego', 'camera', 'other'];

const CATEGORY_ALIASES = {
  shoes: 'sneaker',
  sneakers: 'sneaker',
  sneaker: 'sneaker',
  lego: 'lego',
  legos: 'lego',
  photography: 'camera',
  camera: 'camera',
  cameras: 'camera',
  collectible: 'other',
  collectibles: 'other',
  art: 'other',
  stamps: 'other',
  cards: 'other',
  coins: 'other',
  toys: 'other',
  memorabilia: 'other',
  other: 'other',
};

const ASSET_CATEGORY_VALIDATION_MESSAGE = `Category must be one of: ${ASSET_CATEGORIES.join(', ')}`;

function sanitizeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ');
}

function resolveFileExtension(originalFilename, mimeType) {
  const fromOriginalName = path.extname(String(originalFilename ?? '')).trim();
  if (fromOriginalName) {
    return fromOriginalName.toLowerCase();
  }

  return MIME_EXTENSION_MAP[String(mimeType ?? '').toLowerCase()] || '';
}

function buildAssetFilename(assetName, originalFilename, mimeType) {
  const cleanName = sanitizeText(assetName);
  const cleanOriginalName = sanitizeText(originalFilename || 'asset');
  const fallbackBaseName = path.parse(cleanOriginalName).name || 'asset';
  const baseName = path.parse(cleanName || fallbackBaseName).name || 'asset';
  const extension = resolveFileExtension(originalFilename, mimeType);

  return `${baseName}${extension}`;
}

function normalizeCategoryKey(category) {
  const normalized = String(category ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeCanonicalAssetCategory(category) {
  const normalized = normalizeCategoryKey(category);
  if (!normalized) {
    return null;
  }

  return ASSET_CATEGORIES.includes(normalized) ? normalized : null;
}

function normalizeAnalyzeQueueCategory(category) {
  const normalized = normalizeCategoryKey(category);
  if (!normalized) {
    return null;
  }

  if (ASSET_CATEGORIES.includes(normalized)) {
    return normalized;
  }

  return CATEGORY_ALIASES[normalized] || 'other';
}

function sanitizeCategoryInput(category) {
  const normalized = normalizeCategoryKey(category);
  return normalized || category;
}

function isValidAssetCategory(category) {
  return normalizeCanonicalAssetCategory(category) !== null;
}

function normalizeOptionalText(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function serializeUploadedAsset(asset) {
  return serializeAsset(asset);
}

module.exports = {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_VALIDATION_MESSAGE,
  buildAssetFilename,
  isValidAssetCategory,
  normalizeAnalyzeQueueCategory,
  normalizeCanonicalAssetCategory,
  normalizeCategoryKey,
  normalizeOptionalText,
  sanitizeCategoryInput,
  sanitizeText,
  serializeUploadedAsset,
};
