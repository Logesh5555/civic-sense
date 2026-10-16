/**
 * Development helper: runs the API against an in-memory MongoDB (no local MongoDB install needed).
 * Clean environment with no demo complaints or demo accounts.
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { start } from '../src/server.js';
import { clearDemoData } from './seed.js';

const mongod = await MongoMemoryServer.create();
await start(mongod.getUri('civictrack'));
await clearDemoData();

console.log(`\n========================================`);
console.log(`CivicTrack backend running on port 5000`);
console.log(`Clean State: All demo complaints & demo accounts removed.`);
console.log(`Register new Citizen or Regional Admin accounts at:`);
console.log(`  http://localhost:5173/register`);
console.log(`========================================\n`);

const stop = async () => { await mongoose.disconnect(); await mongod.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
