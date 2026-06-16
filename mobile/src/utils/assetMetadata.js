export function formatFileSizeBytes(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '-';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export function formatFileSizeMB(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }

  return formatFileSizeBytes(value * 1024 * 1024);
}

export function formatUploadedAt(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('vi-VN');
}

export function getDisplayText(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => getDisplayText(entry))
      .filter(Boolean)
      .join(', ');
    return normalized || null;
  }

  if (typeof value === 'object') {
    return (
      getDisplayText(value.value)
      || getDisplayText(value.label)
      || getDisplayText(value.name)
      || getDisplayText(value.message)
      || null
    );
  }

  return null;
}

export function normalizeMetadata(asset) {
  const sizeBytes = typeof asset?.images?.processed?.bytes === 'number'
    ? asset.images.processed.bytes
    : typeof asset?.images?.enhanced?.bytes === 'number'
      ? asset.images.enhanced.bytes
      : typeof asset?.fileSizeBytes === 'number'
        ? asset.fileSizeBytes
        : typeof asset?.fileSizeMB === 'number'
          ? asset.fileSizeMB * 1024 * 1024
          : null;

  return {
    originalFilename: asset?.originalFilename || '-',
    fileSizeMB: formatFileSizeBytes(sizeBytes),
    mimeType: asset?.mimeType || '-',
    uploadedAt: formatUploadedAt(
      asset?.uploadedAt
      ?? asset?.images?.original?.uploadedAt
      ?? asset?.createdAt
    ),
  };
}
