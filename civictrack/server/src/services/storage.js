import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { AppError } from '../utils/http.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/** Detect image type from magic bytes (never trust client MIME alone). */
export function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: '.png' };
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ext: '.webp' };
  return null;
}

/**
 * Local storage driver used for fallback/offline testing.
 */
const localDriver = {
  async saveImage(buffer, ext) {
    await fs.mkdir(config.uploadDir, { recursive: true });
    const name = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const full = path.join(config.uploadDir, name);
    if (path.dirname(full) !== config.uploadDir) throw new AppError(400, 'Invalid file path');
    await fs.writeFile(full, buffer, { flag: 'wx', mode: 0o644 });
    return {
      url: `/uploads/${name}`,
      publicId: `local_${name}`,
    };
  },
  async deleteImage(publicId) {
    if (!publicId || !publicId.startsWith('local_')) return;
    const name = publicId.replace('local_', '');
    const full = path.join(config.uploadDir, name);
    try {
      await fs.unlink(full);
    } catch {
      // Ignore if already removed
    }
  },
};

/**
 * Cloudinary driver for production-grade cloud image hosting.
 */
const cloudinaryDriver = {
  async saveImage(buffer, ext, options) {
    const res = await uploadToCloudinary(buffer, options);
    return {
      url: res.url,
      publicId: res.publicId,
    };
  },
  async deleteImage(publicId) {
    return deleteFromCloudinary(publicId);
  },
};

const drivers = {
  local: localDriver,
  cloudinary: cloudinaryDriver,
};

/**
 * Validates file signature, verifies size limits, and stores image via the active driver.
 *
 * @param {Express.Multer.File} file - Multer memory storage file
 * @param {Object} options - Upload options (tags, folder, etc.)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function storeValidatedImage(file, options = {}) {
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new AppError(400, `"${file.originalname}" is not a valid JPEG, PNG or WebP image`);
  }

  const maxBytes = config.maxUploadMb * 1024 * 1024;
  if (file.size > maxBytes || file.buffer.length > maxBytes) {
    throw new AppError(400, `"${file.originalname}" exceeds maximum allowed size of ${config.maxUploadMb} MB`);
  }

  // Choose driver: prefer cloudinary if configured or explicitly selected
  const activeDriverName = config.storageDriver === 'cloudinary' || config.cloudinary.isConfigured
    ? 'cloudinary'
    : 'local';

  const driver = drivers[activeDriverName];
  if (!driver) throw new AppError(500, `Storage driver "${activeDriverName}" is not configured`);

  return driver.saveImage(file.buffer, type.ext, {
    ...options,
    originalFilename: file.originalname,
  });
}

/**
 * Safely removes an image asset if database save fails or during complaint withdrawal.
 *
 * @param {string} publicId - Cloudinary public_id or local identifier
 */
export async function deleteUploadedImage(publicId) {
  if (!publicId) return;
  if (publicId.startsWith('local_')) {
    return localDriver.deleteImage(publicId);
  }
  return cloudinaryDriver.deleteImage(publicId);
}
