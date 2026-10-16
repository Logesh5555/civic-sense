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
  (req, res, next) => {
    uploader.any()(req, res, (err) => {
      if (err) return next(err);
      const files = req.files || [];
      if (files.length > max) {
        return next(new AppError(400, `Cannot upload more than ${max} image(s)`));
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      req.uploadedImages = [];
      const files = req.files || [];
      const relevant = files.filter((f) => !field || f.fieldname === field || ['images', 'image', 'photo', 'photos', 'file', 'afterPhoto'].includes(f.fieldname));
      for (const f of relevant) {
        const stored = await storeValidatedImage(f, {
          folder: config.cloudinary.folder || 'civictrack/complaints',
        });
        req.uploadedImages.push(stored);
      }
      if (req.uploadedImages.length > 0) {
        req.uploadedImageUrl = req.uploadedImages[0].url;
      }
      next();
    } catch (e) {
      next(e);
    }
  },
];
