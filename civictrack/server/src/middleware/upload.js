import multer from 'multer';
import { config } from '../config/index.js';
import { AppError } from '../utils/http.js';
import { storeValidatedImage } from '../services/storage.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only JPEG, PNG and WebP images are allowed'));
    }
  },
});

/**
 * Middleware that parses multipart/form-data, validates magic bytes signatures,
 * uploads to Cloudinary via server-side stream, and sets req.uploadedImages: Array<{ url: string, publicId: string }>.
 */
export const imageUpload = (field, max = 3) => [
  uploader.array(field, max),
  async (req, res, next) => {
    try {
      req.uploadedImages = [];
      for (const f of req.files || []) {
        const stored = await storeValidatedImage(f, {
          folder: config.cloudinary.folder || 'civictrack/complaints',
        });
        req.uploadedImages.push(stored);
      }
      next();
    } catch (e) {
      next(e);
    }
  },
];
