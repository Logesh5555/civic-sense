import mongoose from 'mongoose';
import { createApp } from '../civictrack/server/src/app.js';
import { config } from '../civictrack/server/src/config/index.js';

let appInstance = null;

async function getApp() {
  if (mongoose.connection.readyState !== 1 && config.mongoUri) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
    } catch (err) {
      console.error('MongoDB Atlas connection error in serverless handler:', err);
    }
  }
  if (!appInstance) {
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
