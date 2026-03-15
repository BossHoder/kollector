/**
 * Storage Adapter
 * Supports both legacy Cloudinary storage and production local-disk storage.
 * The exported function names stay stable so the rest of the app can preserve
 * its existing upload contract.
 * @module config/cloudinary
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

const UPLOADS_ROUTE_PREFIX = '/uploads';
const DEFAULT_STORAGE_ROOT = path.resolve(process.cwd(), 'uploads');
const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function getStorageDriver() {
  const explicitDriver = String(process.env.STORAGE_DRIVER || '').trim().toLowerCase();
  if (explicitDriver) {
    return explicitDriver;
  }

  if (cloudinaryConfigured()) {
    return 'cloudinary';
  }

  return 'local';
}

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL
      || (
        process.env.CLOUDINARY_CLOUD_NAME
        && process.env.CLOUDINARY_API_KEY
        && process.env.CLOUDINARY_API_SECRET
      )
  );
}

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({ secure: true });
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

function getStorageRoot() {
  return path.resolve(process.env.STORAGE_ROOT || DEFAULT_STORAGE_ROOT);
}

function ensureStorageRoot() {
  fs.mkdirSync(getStorageRoot(), { recursive: true });
}

function sanitizeRelativePath(relativePath) {
  const normalized = path.posix.normalize(String(relativePath || '').replace(/\\/g, '/'));
  const stripped = normalized.replace(/^(\.\.(\/|$))+/, '').replace(/^\/+/, '');

  if (!stripped || stripped === '.') {
    throw new Error('Storage path must not be empty');
  }

  return stripped;
}

function getFileExtension(options = {}) {
  if (typeof options.extension === 'string' && options.extension.trim()) {
    const extension = options.extension.trim();
    return extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  }

  if (typeof options.originalFilename === 'string') {
    const filenameExtension = path.extname(options.originalFilename).trim().toLowerCase();
    if (filenameExtension) {
      return filenameExtension;
    }
  }

  if (typeof options.mimetype === 'string' && MIME_EXTENSION_MAP[options.mimetype]) {
    return MIME_EXTENSION_MAP[options.mimetype];
  }

  return '.jpg';
}

function buildLocalPublicId(options = {}) {
  const folder = sanitizeRelativePath(options.folder || 'assets');
  const extension = getFileExtension(options);

  if (options.publicId) {
    const providedPublicId = sanitizeRelativePath(options.publicId);
    if (path.posix.extname(providedPublicId)) {
      return path.posix.join(folder, providedPublicId);
    }
    return path.posix.join(folder, `${providedPublicId}${extension}`);
  }

  return path.posix.join(folder, `${crypto.randomUUID()}${extension}`);
}

function getStoragePublicBaseUrl() {
  const configuredBase = trimTrailingSlash(process.env.STORAGE_PUBLIC_BASE_URL);
  if (configuredBase) {
    return configuredBase;
  }

  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

function buildPublicUrl(publicId) {
  const normalizedPublicId = sanitizeRelativePath(publicId);
  return `${getStoragePublicBaseUrl()}${UPLOADS_ROUTE_PREFIX}/${normalizedPublicId}`;
}

function extractPublicIdFromUrl(url) {
  if (!url) {
    return null;
  }

  const uploadsPrefix = `${UPLOADS_ROUTE_PREFIX}/`;
  const rawUrl = String(url);

  const extractFromPathname = pathname => {
    const index = pathname.indexOf(uploadsPrefix);
    if (index === -1) {
      return null;
    }

    const relativePath = pathname.slice(index + uploadsPrefix.length);
    if (!relativePath) {
      return null;
    }

    return sanitizeRelativePath(decodeURIComponent(relativePath));
  };

  try {
    const parsedUrl = new URL(rawUrl);
    return extractFromPathname(parsedUrl.pathname);
  } catch {
    return extractFromPathname(rawUrl);
  }
}

function isLocalStorageEnabled() {
  return getStorageDriver() === 'local';
}

async function uploadToCloudinary(buffer, options = {}) {
  if (!cloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured');
  }

  configureCloudinary();

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

async function uploadToLocalStorage(buffer, options = {}) {
  ensureStorageRoot();

  const publicId = buildLocalPublicId(options);
  const absolutePath = path.join(getStorageRoot(), publicId.split('/').join(path.sep));

  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, buffer);

  const url = buildPublicUrl(publicId);

  logger.info('Local storage upload successful', {
    publicId,
    url,
    bytes: buffer.length
  });

  return { url, publicId };
}

async function uploadImage(buffer, options = {}) {
  if (getStorageDriver() === 'local') {
    return uploadToLocalStorage(buffer, options);
  }

  return uploadToCloudinary(buffer, options);
}

async function deleteFromCloudinary(publicId) {
  try {
    configureCloudinary();
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

async function deleteFromLocalStorage(publicId) {
  const normalizedPublicId = sanitizeRelativePath(publicId);
  const absolutePath = path.join(getStorageRoot(), normalizedPublicId.split('/').join(path.sep));

  try {
    await fs.promises.rm(absolutePath, { force: true });
    logger.info('Local storage file deleted', { publicId: normalizedPublicId });
  } catch (error) {
    logger.error('Local storage delete failed', {
      error: error.message,
      publicId: normalizedPublicId
    });
    throw error;
  }
}

async function deleteImage(publicId) {
  if (!publicId) {
    return;
  }

  if (getStorageDriver() === 'local') {
    return deleteFromLocalStorage(publicId);
  }

  return deleteFromCloudinary(publicId);
}

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getStorageDriver,
  getStorageRoot,
  getStoragePublicBaseUrl,
  buildPublicUrl,
  extractPublicIdFromUrl,
  isLocalStorageEnabled,
  UPLOADS_ROUTE_PREFIX
};
