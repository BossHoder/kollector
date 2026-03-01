/**
 * Image Picker Service
 *
 * Wrapper for expo-image-picker providing:
 * - Gallery image selection
 * - Camera capture
 * - Permission handling
 * - Consistent result format
 */

import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/**
 * @typedef {Object} PickedImage
 * @property {string} uri - Local file URI
 * @property {string} type - MIME type (e.g., 'image/jpeg')
 * @property {number} fileSize - File size in bytes
 * @property {number} width - Image width in pixels
 * @property {number} height - Image height in pixels
 * @property {string} [fileName] - Original file name if available
 */

// Image picker options
const IMAGE_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: false,
  quality: 0.9, // Slightly compress to reduce upload size
  exif: false, // Don't include EXIF data
};

/**
 * Request camera permissions
 * @returns {Promise<boolean>} True if permission granted
 */
async function requestCameraPermission() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Camera Permission Required',
      'Please grant camera access to take photos of your collectibles.',
      [{ text: 'OK' }]
    );
    return false;
  }
  
  return true;
}

/**
 * Request media library permissions
 * @returns {Promise<boolean>} True if permission granted
 */
async function requestGalleryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert(
      'Photo Library Permission Required',
      'Please grant photo library access to select images of your collectibles.',
      [{ text: 'OK' }]
    );
    return false;
  }
  
  return true;
}

/**
 * Normalize picker result to consistent format
 * @param {ImagePicker.ImagePickerResult} result
 * @returns {PickedImage | null}
 */
function normalizePickerResult(result) {
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  
  return {
    uri: asset.uri,
    type: asset.mimeType || asset.type || 'image/jpeg',
    fileSize: asset.fileSize || 0,
    width: asset.width,
    height: asset.height,
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
  };
}

/**
 * Pick an image from the device gallery
 * @returns {Promise<PickedImage | null>}
 */
export async function pickImageFromGallery() {
  const hasPermission = await requestGalleryPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
    return normalizePickerResult(result);
  } catch (error) {
    console.error('Error picking image from gallery:', error);
    Alert.alert('Error', 'Failed to pick image from gallery. Please try again.');
    return null;
  }
}

/**
 * Capture an image using the device camera
 * @returns {Promise<PickedImage | null>}
 */
export async function pickImageFromCamera() {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    const result = await ImagePicker.launchCameraAsync(IMAGE_OPTIONS);
    return normalizePickerResult(result);
  } catch (error) {
    console.error('Error capturing image from camera:', error);
    Alert.alert('Error', 'Failed to capture image. Please try again.');
    return null;
  }
}

/**
 * Show action sheet to choose between camera and gallery
 * Returns the selected image or null if cancelled
 *
 * @param {Object} options
 * @param {Function} [options.onSourceSelected] - Called with 'camera' or 'gallery' when source selected
 * @returns {Promise<{ source: 'camera' | 'gallery', image: PickedImage } | null>}
 */
export async function pickImageWithSource(options = {}) {
  return new Promise((resolve) => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo of your collectible',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            options.onSourceSelected?.('camera');
            const image = await pickImageFromCamera();
            resolve(image ? { source: 'camera', image } : null);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            options.onSourceSelected?.('gallery');
            const image = await pickImageFromGallery();
            resolve(image ? { source: 'gallery', image } : null);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

/**
 * Check if camera is available on this device
 * @returns {Promise<boolean>}
 */
export async function isCameraAvailable() {
  if (Platform.OS === 'web') {
    return false;
  }
  
  const { status } = await ImagePicker.getCameraPermissionsAsync();
  // If we can even check status, camera is likely available
  return status !== undefined;
}

export default {
  pickImageFromGallery,
  pickImageFromCamera,
  pickImageWithSource,
  isCameraAvailable,
};
