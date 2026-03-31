const path = require('path');
const {
  ASSET_THEME_FALLBACK_ID,
  resolveAssetThemeId,
} = require('./theme-presets.catalog');
const { ENHANCEMENT_STATUS } = require('./enhancement.constants');

function toPlainObject(value) {
  if (!value) {
    return null;
  }

  return typeof value.toObject === 'function' ? value.toObject() : value;
}

function stripFileExtension(filename) {
  if (!filename) {
    return null;
  }

  return path.parse(String(filename)).name || null;
}

function normalizeEnhancement(enhancement = {}) {
  return {
    status: enhancement.status || ENHANCEMENT_STATUS.IDLE,
    lastJobId: enhancement.lastJobId || undefined,
    requestedBy: enhancement.requestedBy ? String(enhancement.requestedBy) : undefined,
    requestedAt: enhancement.requestedAt || undefined,
    completedAt: enhancement.completedAt || undefined,
    errorCode: enhancement.errorCode || undefined,
    errorMessage: enhancement.errorMessage || undefined,
    attemptCount: typeof enhancement.attemptCount === 'number' ? enhancement.attemptCount : 0,
  };
}

function normalizePresentation(presentation = {}) {
  return {
    themeOverrideId:
      presentation.themeOverrideId === undefined ? null : presentation.themeOverrideId,
  };
}

function serializeAsset(asset, options = {}) {
  const object = toPlainObject(asset);

  if (!object) {
    return null;
  }

  const id = object.id ? String(object.id) : String(object._id);
  const userDefaultThemeId = options.userDefaultThemeId ?? null;
  const presentation = normalizePresentation(object.presentation || {});
  const enhancement = normalizeEnhancement(object.enhancement || {});

  return {
    ...object,
    id,
    _id: object._id ? String(object._id) : id,
    title:
      object.title
      || [object.details?.brand, object.details?.model].filter(Boolean).join(' ').trim()
      || stripFileExtension(object.originalFilename),
    uploadedAt: object.images?.original?.uploadedAt || object.createdAt || null,
    presentation,
    resolvedThemeId: resolveAssetThemeId(
      presentation.themeOverrideId,
      userDefaultThemeId
    ) || ASSET_THEME_FALLBACK_ID,
    enhancement,
  };
}

module.exports = {
  normalizeEnhancement,
  normalizePresentation,
  serializeAsset,
};
