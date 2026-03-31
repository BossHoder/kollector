import type { Asset } from '@/types/asset';

function stripFileExtension(filename?: string | null): string | null {
  if (!filename) {
    return null;
  }

  const trimmed = filename.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\.[^.]+$/, '');
}

function deriveTitle(rawAsset: Partial<Asset> & Record<string, any>): string | undefined {
  const detailsTitle = [rawAsset.details?.brand, rawAsset.details?.model]
    .filter(Boolean)
    .join(' ')
    .trim();

  return rawAsset.title || detailsTitle || stripFileExtension(rawAsset.originalFilename) || undefined;
}

export function mapAsset(rawAsset: Partial<Asset> & Record<string, any>): Asset {
  const id = rawAsset.id ? String(rawAsset.id) : rawAsset._id ? String(rawAsset._id) : '';
  const originalImageUrl =
    rawAsset.originalImageUrl ||
    rawAsset.imageUrl ||
    rawAsset.images?.original?.url ||
    undefined;
  const enhancedImageUrl =
    rawAsset.enhancedImageUrl ||
    rawAsset.images?.enhanced?.url ||
    undefined;
  const processedImageUrl =
    rawAsset.processedImageUrl ||
    rawAsset.images?.processed?.url ||
    undefined;
  const thumbnailUrl =
    rawAsset.thumbnailUrl ||
    rawAsset.images?.thumbnail?.url ||
    processedImageUrl ||
    originalImageUrl;
  const fileSizeMB =
    typeof rawAsset.fileSizeMB === 'number'
      ? rawAsset.fileSizeMB
      : typeof rawAsset.fileSizeBytes === 'number'
        ? rawAsset.fileSizeBytes / (1024 * 1024)
        : undefined;
  const uploadedAt =
    rawAsset.uploadedAt ||
    rawAsset.images?.original?.uploadedAt ||
    rawAsset.createdAt ||
    undefined;

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
    fileSizeMB,
    uploadedAt,
    enhancement: rawAsset.enhancement || { status: 'idle', attemptCount: 0 },
    presentation: rawAsset.presentation || { themeOverrideId: null },
  } as Asset;
}

export function mapAssets(rawAssets: Array<Partial<Asset> & Record<string, any>> = []): Asset[] {
  return rawAssets.map(mapAsset);
}
