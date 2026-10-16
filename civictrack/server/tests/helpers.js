import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';
import { User, Department, Complaint, Notification, Counter } from '../src/models/index.js';

let mongod;
export const app = createApp();

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('civictrack-test'));
  await Promise.all([User, Department, Complaint, Notification, Counter].map((m) => m.init()));
}
export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
  fs.rmSync(config.uploadDir, { recursive: true, force: true });
}
export async function resetDb() {
  await Promise.all([User, Department, Complaint, Notification, Counter].map((m) => m.deleteMany({})));
}

export const PASSWORD = 'Test1234pass';
let hash;
export async function makeUser(over = {}) {
  hash ||= await bcrypt.hash(PASSWORD, 4);
  const n = Math.random().toString(36).slice(2, 8);
  return User.create({ name: `User ${n}`, email: `${n}@test.dev`, passwordHash: hash, role: 'citizen', ...over });
}

/** Returns a supertest agent that holds the session cookie for the user. */
export async function loginAs(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed ${res.status}`);
  return agent;
}

export const complaintPayload = (over = {}) => ({
  title: 'Large pothole on Main Street',
  description: 'There is a very deep pothole near the bus stop causing trouble.',
  category: 'potholes',
  locationDescription: 'Main Street near bus stop',
  latitude: '13.08', longitude: '80.27',
  ...over,
});

export async function submitComplaint(agent, over = {}) {
  const res = await agent.post('/api/complaints').send(complaintPayload(over));
  if (res.status !== 201) throw new Error(`submit failed ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.complaint;
}

// Minimal valid 1x1 PNG
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
