import fs from 'fs';
import path from 'path';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { config } from '../src/config/index.js';
import { User, Complaint } from '../src/models/index.js';

async function runTest() {
  console.log('[1] Connecting to MongoDB Atlas...');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log('[✓] Connected to MongoDB Atlas.');

  const app = createApp();

  // Find or create a test citizen
  let citizen = await User.findOne({ role: 'citizen' });
  if (!citizen) {
    citizen = await User.create({
      name: 'Test Citizen',
      email: 'citizen_verifier@civictrack.dev',
      passwordHash: '$2b$04$testpasswordhashplaceholder',
      role: 'citizen',
    });
  }

  const { signToken, COOKIE_NAME } = await import('../src/middleware/auth.js');
  const token = signToken(citizen);

  console.log(`[2] Authenticated as citizen "${citizen.name}" (${citizen._id}).`);

  // Create a minimal 1x1 valid PNG image buffer
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

  console.log('[3] Submitting new complaint with photograph to POST /api/complaints...');
  const res = await request(app)
    .post('/api/complaints')
    .set('Cookie', `${COOKIE_NAME}=${token}`)
    .field('title', 'Verified Cloudinary Road Hazard')
    .field('description', 'Testing Cloudinary image URL persistence in MongoDB Atlas.')
    .field('category', 'potholes')
    .field('locationDescription', 'Anna Salai, Chennai')
    .attach('images', pngBuffer, { filename: 'hazard-road.png', contentType: 'image/png' });

  if (res.status !== 201) {
    console.error('[✗] Submission failed with status:', res.status, res.body);
    process.exit(1);
  }

  const newRef = res.body.data.complaint.referenceNumber;
  console.log(`[✓] Complaint submitted successfully! Reference: ${newRef}`);
  console.log('Response complaint data:', JSON.stringify(res.body.data.complaint, null, 2));

  console.log('\n[4] Querying RAW document directly from MongoDB Atlas collection...');
  const rawDoc = await mongoose.connection.db.collection('complaints').findOne({ referenceNumber: newRef });

  console.log('\n======================================================');
  console.log('RAW MONGODB ATLAS DOCUMENT INSPECTION');
  console.log('======================================================');
  console.log('Document _id       :', rawDoc._id);
  console.log('referenceNumber    :', rawDoc.referenceNumber);
  console.log('title              :', rawDoc.title);
  console.log('imageUrl (top-level):', rawDoc.imageUrl);
  console.log('images (array)     :', JSON.stringify(rawDoc.images, null, 2));
  console.log('======================================================\n');

  // Verify assertions
  if (!rawDoc.imageUrl || !rawDoc.imageUrl.startsWith('https://res.cloudinary.com/')) {
    throw new Error(`FAIL: rawDoc.imageUrl is missing or not a Cloudinary URL: ${rawDoc.imageUrl}`);
  }
  if (!Array.isArray(rawDoc.images) || rawDoc.images.length === 0) {
    throw new Error('FAIL: rawDoc.images is empty or not an array');
  }
  const firstImage = rawDoc.images[0];
  if (!firstImage.url || !firstImage.url.startsWith('https://res.cloudinary.com/')) {
    throw new Error(`FAIL: images[0].url is invalid: ${firstImage.url}`);
  }
  if (!firstImage.publicId && !firstImage.public_id) {
    throw new Error('FAIL: images[0] publicId is missing');
  }

  console.log('[✓] VERIFICATION PASSED: Cloudinary URL and public ID are verified in MongoDB Atlas!');

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('[✗] Test execution failed:', err);
  process.exit(1);
});
