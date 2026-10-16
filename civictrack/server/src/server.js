import mongoose from 'mongoose';
import { config } from './config/index.js';
import { createApp } from './app.js';

mongoose.set('strictQuery', true);

function sanitizeUri(rawUri) {
  try {
    return rawUri.replace(/:([^@]+)@/, ':****@');
  } catch {
    return 'configured database';
  }
}

export async function start(uri = config.mongoUri) {
  try {
    console.log(`Connecting to MongoDB: ${sanitizeUri(uri)}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    await mongoose.syncIndexes();
    console.log(`✓ Connected successfully to MongoDB (${mongoose.connection.host || 'cluster'})`);
    if (config.storageDriver === 'cloudinary' || config.cloudinary.isConfigured) {
      if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
        console.error('✗ Cloudinary configuration incomplete. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in .env.');
      } else {
        console.log(`✓ Cloudinary image storage active (Cloud: ${config.cloudinary.cloudName})`);
      }
    } else {
      console.log('ℹ Local file storage active (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env for Cloudinary)');
    }
  } catch (err) {
    if (uri.includes('mongodb+srv://')) {
      console.error('  → Tip: For MongoDB Atlas, ensure your current IP is whitelisted (Network Access -> Add 0.0.0.0/0) and check your database username/password.');
    } else if (uri.includes('127.0.0.1:27017')) {
      console.error('  → Notice: MONGODB_URI is not set in a .env file! It defaulted to local MongoDB (which is not installed or running).');
      console.error('  → To connect to your Global DB, create a .env file with:');
      console.error('    MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/civictrack?retryWrites=true&w=majority');
    }
    throw err;
  }
  const app = createApp();
  return app.listen(config.port, () => console.log(`CivicTrack API listening on :${config.port} (${config.env})`));
}

// Only auto-start when executed directly (not when imported by scripts/tests).
if (process.argv[1] && /server\.js$/.test(process.argv[1])) {
  start().catch(() => { process.exit(1); });
}
