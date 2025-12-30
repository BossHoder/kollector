/**
 * Cloudinary Configuration and Upload Helper
 * Handles image uploads to Cloudinary CDN
 * @module config/cloudinary
 */

const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

// Configure Cloudinary from environment variables
// Supports both CLOUDINARY_URL and individual vars
if (process.env.CLOUDINARY_URL) {
  // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config({ secure: true });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer from multer
 * @param {Object} options - Upload options
 * @param {string} [options.folder='assets'] - Cloudinary folder
 * @param {string} [options.publicId] - Optional custom public ID
 * @returns {Promise<{url: string, publicId: string}>} Upload result
 */
async function uploadImage(buffer, options = {}) {
  const { folder = 'assets', publicId } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      format: 'jpg',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failed', { 
            error: error.message,
            folder 
          });
          return reject(error);
        }

        logger.info('Cloudinary upload successful', {
          publicId: result.public_id,
          url: result.secure_url,
          bytes: result.bytes
        });

        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info('Cloudinary image deleted', { publicId });
  } catch (error) {
    logger.error('Cloudinary delete failed', { 
      error: error.message, 
      publicId 
    });
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage
};
