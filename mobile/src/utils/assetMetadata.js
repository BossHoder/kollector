export function formatFileSizeMB(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return `${value.toFixed(2)} MB`;
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
  // fileSizeMB may come pre-computed (number) or as raw bytes via fileSizeBytes
  const sizeMB = typeof asset?.fileSizeMB === 'number'
    ? asset.fileSizeMB
    : typeof asset?.fileSizeBytes === 'number'
      ? asset.fileSizeBytes / (1024 * 1024)
      : null;

  return {
    originalFilename: asset?.originalFilename || '-',
    fileSizeMB: formatFileSizeMB(sizeMB),
    mimeType: asset?.mimeType || '-',
    uploadedAt: formatUploadedAt(
      asset?.uploadedAt
      ?? asset?.images?.original?.uploadedAt
      ?? asset?.createdAt
    ),
  };
}
