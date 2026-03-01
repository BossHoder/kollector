/**
 * Upload API Wrapper
 *
 * API functions for asset upload:
 * - uploadAsset: Upload image to analyze-queue (multipart/form-data)
 */

import { uploadFile } from '../services/apiClient';
import { Platform } from 'react-native';

/**
 * @typedef {Object} UploadAssetParams
 * @property {string} uri - Local file URI
 * @property {string} type - MIME type (e.g., 'image/jpeg')
 * @property {string} [fileName] - File name
 * @property {string} category - Asset category
 * @property {string} [title] - Optional title
 * @property {string} [notes] - Optional notes
 */

/**
 * @typedef {Object} UploadAssetResponse
 * @property {Object} asset - Created asset object
 * @property {string} asset.id - Asset ID
 * @property {string} asset.status - Asset status ('processing')
 */

/**
 * Upload an asset image for AI analysis
 *
 * This calls POST /api/assets/analyze-queue with multipart form data.
 * The server will create the asset and queue it for AI processing.
 *
 * @param {UploadAssetParams} params
 * @returns {Promise<UploadAssetResponse>}
 */
export async function uploadAsset({ uri, type, fileName, category, title, notes }) {
  if (!uri) {
    throw new Error('Image URI is required');
  }

  if (!category) {
    throw new Error('Category is required');
  }

  // Build FormData
  const formData = new FormData();

  // Add the image file
  if (Platform.OS === 'web') {
    // On web, fetch the blob from the URI and append it properly
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('image', blob, fileName || `upload_${Date.now()}.jpg`);
  } else {
    // React Native requires a specific format for file uploads
    formData.append('image', {
      uri,
      type: type || 'image/jpeg',
      name: fileName || `upload_${Date.now()}.jpg`,
    });
  }

  // Add metadata
  formData.append('category', category);
  
  if (title) {
    formData.append('title', title);
  }
  
  if (notes) {
    formData.append('notes', notes);
  }

  // Use the uploadFile function from apiClient for proper multipart handling
  const response = await uploadFile('/assets/analyze-queue', formData);

  return {
    asset: response.asset || response,
  };
}

/**
 * Get upload progress (if supported by implementation)
 * This is a placeholder for future upload progress tracking
 *
 * @param {string} uploadId
 * @returns {Promise<{ progress: number, status: string }>}
 */
export async function getUploadProgress(uploadId) {
  // Placeholder - actual implementation would track upload progress
  return {
    progress: 100,
    status: 'complete',
  };
}

export default {
  uploadAsset,
  getUploadProgress,
};
