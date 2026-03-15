const path = require('path');

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

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

function normalizeAnalyzeQueueCategory(category) {
  const normalized = String(category ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return null;
  }

  return normalized;
}

function normalizeOptionalText(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function serializeUploadedAsset(asset) {
  const object = typeof asset.toObject === 'function' ? asset.toObject() : asset;
  const uploadedAt = object.images?.original?.uploadedAt || object.createdAt || null;

  return {
    ...object,
    id: object.id ? String(object.id) : String(object._id),
    uploadedAt,
    title: object.title || path.parse(object.originalFilename || '').name || null,
  };
}

module.exports = {
  buildAssetFilename,
  normalizeAnalyzeQueueCategory,
  normalizeOptionalText,
  serializeUploadedAsset,
};
