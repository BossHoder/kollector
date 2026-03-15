/**
 * Upload API Wrapper
 *
 * API functions for asset upload:
 * - uploadAsset: Upload image to analyze-queue (multipart/form-data)
 */

import { uploadFile } from '../services/apiClient';
import { Platform } from 'react-native';
import { mapAsset } from '../utils/assetMapper';

/**
 * @typedef {Object} UploadAssetParams
 * @property {string} uri
 * @property {string} type
 * @property {string} [fileName]
 * @property {string} category
 * @property {string} assetName
 * @property {boolean} [runAi]
 * @property {string} [title]
 * @property {string} [notes]
 */

export async function uploadAsset({
  uri,
  type,
  fileName,
  category,
  assetName,
  runAi = true,
  title,
  notes,
}) {
  if (!uri) {
    throw new Error('Image URI is required');
  }

  if (!category) {
    throw new Error('Category is required');
  }

  if (!assetName) {
    throw new Error('Asset name is required');
  }

  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('image', blob, fileName || `upload_${Date.now()}.jpg`);
  } else {
    formData.append('image', {
      uri,
      type: type || 'image/jpeg',
      name: fileName || `upload_${Date.now()}.jpg`,
    });
  }

  formData.append('category', category);
  formData.append('assetName', assetName);
  formData.append('runAi', String(runAi));

  if (title) {
    formData.append('title', title);
  }

  if (notes) {
    formData.append('notes', notes);
  }

  const response = await uploadFile('/assets/analyze-queue', formData);
  const payload = response.data || response;
  const mappedAsset = mapAsset(payload.asset || response.asset || response);

  return {
    asset: {
      ...mappedAsset,
      originalFilename: mappedAsset.originalFilename || fileName || null,
      fileSizeMB: mappedAsset.fileSizeMB || null,
      mimeType: mappedAsset.mimeType || type || null,
      uploadedAt: mappedAsset.uploadedAt || mappedAsset.createdAt || new Date().toISOString(),
    },
    jobId: payload.jobId ?? null,
    status: payload.status ?? mappedAsset.status,
  };
}

export async function getUploadProgress(uploadId) {
  return {
    progress: 100,
    status: 'complete',
  };
}

export default {
  uploadAsset,
  getUploadProgress,
};
