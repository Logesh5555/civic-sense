import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { config } from './index.js';
import { AppError } from '../utils/http.js';

// Configure Cloudinary SDK with secure HTTPS URLs
if (config.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

/**
 * Validates that all required Cloudinary environment variables are present.
 * Throws a clear error without leaking credentials if any are missing.
 */
export function assertCloudinaryConfig() {
  const missing = [];
  if (!config.cloudinary.cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!config.cloudinary.apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!config.cloudinary.apiSecret) missing.push('CLOUDINARY_API_SECRET');

  if (missing.length > 0) {
    throw new AppError(
      500,
      `Cloudinary configuration incomplete. Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Uploads an image buffer directly to Cloudinary using a stream.
 * Automatically organizes uploads under the configured folder (e.g. civictrack/complaints)
 * and enforces web-optimized transformations.
 *
 * @param {Buffer} buffer - Validated image buffer
 * @param {Object} options - Upload options (folder, tags, publicId, etc.)
 * @returns {Promise<{ url: string, publicId: string, format: string, bytes: number }>}
 */
export function uploadToCloudinary(buffer, options = {}) {
  assertCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || config.cloudinary.folder || 'civictrack/complaints',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      timeout: 30000,
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(
          new AppError(502, `Cloudinary upload failed: ${error.message || 'Network or service timeout'}`)
        );
      }
      resolve({
        url: result.secure_url,
        secure_url: result.secure_url,
        publicId: result.public_id,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      });
    });

    Readable.from(buffer).pipe(stream);
  });
}

/**
 * Safely deletes an asset from Cloudinary by its publicId.
 * Does not throw if asset is missing or service is temporarily unavailable.
 *
 * @param {string} publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId || !config.cloudinary.isConfigured) return;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    return result;
  } catch (err) {
    console.error(`[Cloudinary] Could not remove asset (${publicId}): ${err.message}`);
  }
}

export { cloudinary };
