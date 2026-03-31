function stripFileExtension(filename) {
  if (!filename) {
    return null;
  }

  return String(filename).trim().replace(/\.[^.]+$/, '') || null;
}

function deriveTitle(asset) {
  const detailsTitle = [asset?.details?.brand, asset?.details?.model]
    .filter(Boolean)
    .join(' ')
    .trim();

  return asset?.title || detailsTitle || stripFileExtension(asset?.originalFilename) || null;
}

export function mapAsset(rawAsset = {}) {
  const id = rawAsset.id ? String(rawAsset.id) : rawAsset._id ? String(rawAsset._id) : '';
  const originalImageUrl =
    rawAsset.originalImageUrl ||
    rawAsset.imageUrl ||
    rawAsset.images?.original?.url ||
    null;
  const enhancedImageUrl =
    rawAsset.enhancedImageUrl ||
    rawAsset.images?.enhanced?.url ||
    null;
  const processedImageUrl =
    rawAsset.processedImageUrl ||
    rawAsset.images?.processed?.url ||
    null;
  const thumbnailUrl =
    rawAsset.thumbnailUrl ||
    rawAsset.images?.thumbnail?.url ||
    processedImageUrl ||
    originalImageUrl;
  const fileSizeMB = typeof rawAsset.fileSizeMB === 'number'
    ? rawAsset.fileSizeMB
    : typeof rawAsset.fileSizeBytes === 'number'
      ? rawAsset.fileSizeBytes / (1024 * 1024)
      : null;
  const uploadedAt =
    rawAsset.uploadedAt ||
    rawAsset.images?.original?.uploadedAt ||
    rawAsset.createdAt ||
    null;

  return {
    ...rawAsset,
    id,
    _id: rawAsset._id ? String(rawAsset._id) : id,
    title: deriveTitle(rawAsset),
    imageUrl: originalImageUrl,
    originalImageUrl,
    thumbnailUrl,
    processedImageUrl,
    enhancedImageUrl,
    detailImageUrl: enhancedImageUrl || processedImageUrl || originalImageUrl,
    primaryImage: rawAsset.primaryImage || (originalImageUrl ? { url: originalImageUrl } : null),
    fileSizeMB,
    uploadedAt,
    enhancement: rawAsset.enhancement || { status: 'idle', attemptCount: 0 },
    presentation: rawAsset.presentation || { themeOverrideId: null },
  };
}

export function mapAssets(rawAssets = []) {
  return rawAssets.map((asset) => mapAsset(asset));
}
