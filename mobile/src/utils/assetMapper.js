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
  const processedImageUrl =
    rawAsset.processedImageUrl ||
    rawAsset.images?.processed?.url ||
    rawAsset.thumbnailUrl ||
    rawAsset.images?.thumbnail?.url ||
    null;
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
    thumbnailUrl: processedImageUrl || originalImageUrl,
    processedImageUrl,
    primaryImage: rawAsset.primaryImage || (originalImageUrl ? { url: originalImageUrl } : null),
    fileSizeMB,
    uploadedAt,
  };
}

export function mapAssets(rawAssets = []) {
  return rawAssets.map((asset) => mapAsset(asset));
}
