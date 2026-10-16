import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 60000,
    hookTimeout: 180000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      UPLOAD_DIR: 'uploads-test',
      MAX_UPLOAD_MB: '1',
      MONGOMS_DOWNLOAD_DIR: path.resolve(__dirname, 'node_modules/.cache/mongodb-memory-server'),
    },
  },
});
