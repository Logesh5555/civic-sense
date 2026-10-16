import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, 'server', '.env') });
dotenv.config({ path: path.join(root, '..', '.env') });

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set (min 32 chars) in production');
}

export const config = {
  env,
  isProd,
  isTest: env === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civictrack',
  // Dev-only fallback secret; production refuses to boot without a real one.
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me-0123456789',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 5,
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'CivicTrack <no-reply@example.com>',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'civictrack/complaints',
    isConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },
  storageDriver: (() => {
    if (env === 'test') {
      return (process.env.STORAGE_DRIVER === 'cloudinary' && process.env.CLOUDINARY_CLOUD_NAME) ? 'cloudinary' : 'local';
    }
    if (process.env.STORAGE_DRIVER === 'cloudinary') {
      return process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local';
    }
    return process.env.STORAGE_DRIVER || (process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local');
  })(),
  rootDir: root,
};
