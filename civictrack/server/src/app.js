import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './utils/http.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl.split(',').map((s) => s.trim()), credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  fs.mkdirSync(config.uploadDir, { recursive: true });
  app.use('/uploads', express.static(config.uploadDir, {
    dotfiles: 'deny', index: false, fallthrough: false,
    setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Disposition', 'inline'); },
  }));

  app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
  app.use('/api', routes);
  app.use('/api', notFound);

  // Optionally serve the built client from the same origin (see README "Deployment").
  const dist = path.resolve(config.rootDir, 'client/dist');
  if (config.isProd && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^\/(?!api|uploads).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(errorHandler);
  return app;
}
