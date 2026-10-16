import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { detectImageType, deleteUploadedImage } from '../src/services/storage.js';
import { assertCloudinaryConfig } from '../src/config/cloudinary.js';
import { Complaint } from '../src/models/index.js';
import { PNG, startDb, stopDb } from './helpers.js';

// Minimal valid JPEG (SOI marker)
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
// Minimal valid WebP (RIFF....WEBP)
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38]);

describe('Cloudinary & Storage Service', () => {
  beforeAll(async () => {
    await startDb();
  });

  afterAll(async () => {
    await stopDb();
  });

  describe('detectImageType magic byte validator', () => {
    it('correctly identifies PNG images', () => {
      expect(detectImageType(PNG)?.mime).toBe('image/png');
      expect(detectImageType(PNG)?.ext).toBe('.png');
    });

    it('correctly identifies JPEG images', () => {
      expect(detectImageType(JPEG)?.mime).toBe('image/jpeg');
      expect(detectImageType(JPEG)?.ext).toBe('.jpg');
    });

    it('correctly identifies WebP images', () => {
      expect(detectImageType(WEBP)?.mime).toBe('image/webp');
      expect(detectImageType(WEBP)?.ext).toBe('.webp');
    });

    it('rejects non-image payloads (e.g. text/exe)', () => {
      expect(detectImageType(Buffer.from('Hello world this is plain text'))).toBeNull();
      expect(detectImageType(Buffer.from('MZ\x90\x00\x03\x00\x00\x00'))).toBeNull();
    });
  });

  describe('assertCloudinaryConfig validation', () => {
    it('throws error when Cloudinary configuration is missing in test env', () => {
      expect(() => assertCloudinaryConfig()).toThrow(/Cloudinary configuration incomplete/);
    });
  });

  describe('deleteUploadedImage', () => {
    it('safely handles null/empty publicId without error', async () => {
      await expect(deleteUploadedImage(null)).resolves.not.toThrow();
      await expect(deleteUploadedImage(undefined)).resolves.not.toThrow();
    });
  });

  describe('Complaint Schema Image compatibility', () => {
    it('stores Cloudinary object with url and publicId', async () => {
      const c = new Complaint({
        referenceNumber: 'CT-2026-0001',
        citizenId: new mongoose.Types.ObjectId(),
        title: 'Road issue',
        description: 'Test road issue with Cloudinary image',
        category: 'potholes',
        locationDescription: 'Road 5',
        images: [{ url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', publicId: 'civictrack/complaints/sample' }],
      });
      await c.validate();
      expect(c.images[0].url).toBe('https://res.cloudinary.com/demo/image/upload/sample.jpg');
      expect(c.images[0].publicId).toBe('civictrack/complaints/sample');
    });

    it('normalizes legacy string image URLs seamlessly', async () => {
      const c = new Complaint({
        referenceNumber: 'CT-2026-0002',
        citizenId: new mongoose.Types.ObjectId(),
        title: 'Legacy pothole',
        description: 'Legacy format test with plain string',
        category: 'potholes',
        locationDescription: 'Old road',
        images: ['/uploads/legacy123.png'],
      });
      await c.validate();
      expect(c.images[0].url).toBe('/uploads/legacy123.png');
      expect(c.images[0].publicId).toBeNull();
    });
  });
});
