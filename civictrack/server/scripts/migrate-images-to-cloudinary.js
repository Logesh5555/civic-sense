import path from 'node:path';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import { config } from '../src/config/index.js';
import { assertCloudinaryConfig, uploadToCloudinary } from '../src/config/cloudinary.js';
import { Complaint } from '../src/models/index.js';

export async function migrateImagesToCloudinary({ dryRun = false, log = console.log } = {}) {
  log(`\n========================================`);
  log(` CivicTrack - Cloudinary Migration Tool `);
  log(` Mode: ${dryRun ? 'DRY-RUN (No changes will be saved)' : 'LIVE MIGRATION'}`);
  log(`========================================\n`);

  if (!dryRun) {
    try {
      assertCloudinaryConfig();
      log(`[✓] Cloudinary configuration verified (cloud: ${config.cloudinary.cloudName}).`);
    } catch (err) {
      log(`[✗] Cannot run migration: ${err.message}`);
      throw err;
    }
  }

  log(`[i] Connecting to MongoDB...`);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  log(`[✓] Connected to MongoDB database.`);

  const complaints = await Complaint.find({});
  log(`[i] Found ${complaints.length} complaint(s) to inspect.\n`);

  let scannedCount = 0;
  let migratedImagesCount = 0;
  let skippedCount = 0;
  let missingFilesCount = 0;

  for (const comp of complaints) {
    scannedCount++;
    let modified = false;

    // 1. Process comp.images
    if (Array.isArray(comp.images) && comp.images.length > 0) {
      const updatedImages = [];
      for (let idx = 0; idx < comp.images.length; idx++) {
        const item = comp.images[idx];
        const currentUrl = typeof item === 'object' && item !== null ? item.url : item;
        const currentPublicId = typeof item === 'object' && item !== null ? item.publicId : null;

        if (currentPublicId || (currentUrl && currentUrl.startsWith('http'))) {
          // Already in Cloudinary or remote
          updatedImages.push(typeof item === 'object' ? item : { url: currentUrl, publicId: null });
          skippedCount++;
          continue;
        }

        if (!currentUrl || typeof currentUrl !== 'string' || !currentUrl.trim()) {
          continue;
        }

        // Local upload pattern e.g. /uploads/filename.ext or filename.ext
        const filename = path.basename(currentUrl.trim());
        if (!filename || filename === '.' || filename === '/' || filename === '\\') {
          continue;
        }
        const localFilePath = path.join(config.uploadDir, filename);

        try {
          const stat = await fs.stat(localFilePath);
          if (!stat.isFile()) {
            continue;
          }
          log(`  [Found local] Complaint #${comp.referenceNumber} image ${idx + 1}: ${filename}`);

          if (dryRun) {
            log(`    -> [DRY-RUN] Would upload ${filename} to Cloudinary folder "${config.cloudinary.folder}"`);
            updatedImages.push({ url: `[dry-run-cloudinary-url-for-${filename}]`, publicId: `dry-run-${filename}` });
            migratedImagesCount++;
            modified = true;
          } else {
            const buffer = await fs.readFile(localFilePath);
            const uploadRes = await uploadToCloudinary(buffer, {
              folder: config.cloudinary.folder,
            });
            log(`    -> [✓] Uploaded to Cloudinary: ${uploadRes.secure_url}`);
            updatedImages.push({
              url: uploadRes.secure_url,
              publicId: uploadRes.public_id,
            });
            migratedImagesCount++;
            modified = true;
          }
        } catch {
          log(`  [!] Warning: Local file missing at "${localFilePath}". Preserving existing reference.`);
          updatedImages.push(typeof item === 'object' ? item : { url: currentUrl, publicId: null });
          missingFilesCount++;
        }
      }

      if (modified) {
        comp.images = updatedImages;
      }
    }

    // 2. Process comp.resolutionImage
    if (comp.resolutionImage) {
      const resItem = comp.resolutionImage;
      const resUrl = typeof resItem === 'object' && resItem !== null ? resItem.url : resItem;
      const resPublicId = typeof resItem === 'object' && resItem !== null ? resItem.publicId : null;

      if (!resPublicId && resUrl && typeof resUrl === 'string' && !resUrl.startsWith('http')) {
        const resFilename = path.basename(resUrl.trim());
        if (resFilename && resFilename !== '.' && resFilename !== '/' && resFilename !== '\\') {
          const resLocalPath = path.join(config.uploadDir, resFilename);

          try {
            const stat = await fs.stat(resLocalPath);
            if (stat.isFile()) {
              log(`  [Found local resolution] Complaint #${comp.referenceNumber}: ${resFilename}`);
              if (dryRun) {
                log(`    -> [DRY-RUN] Would upload resolution image ${resFilename} to Cloudinary`);
                comp.resolutionImage = { url: `[dry-run-cloudinary-url-for-${resFilename}]`, publicId: `dry-run-${resFilename}` };
                migratedImagesCount++;
                modified = true;
              } else {
                const buffer = await fs.readFile(resLocalPath);
                const uploadRes = await uploadToCloudinary(buffer, {
                  folder: `${config.cloudinary.folder}/resolutions`,
                });
                log(`    -> [✓] Uploaded resolution image: ${uploadRes.secure_url}`);
                comp.resolutionImage = {
                  url: uploadRes.secure_url,
                  publicId: uploadRes.public_id,
                };
                migratedImagesCount++;
                modified = true;
              }
            }
          } catch {
            log(`  [!] Warning: Resolution image missing locally: "${resLocalPath}"`);
            missingFilesCount++;
          }
        }
      } else {
        skippedCount++;
      }
    }

    if (modified && !dryRun) {
      await comp.save();
      log(`  [✓] Updated complaint #${comp.referenceNumber} in MongoDB.\n`);
    }
  }

  log(`\n========================================`);
  log(` Migration Summary`);
  log(`========================================`);
  log(` Complaints Scanned  : ${scannedCount}`);
  log(` Images Migrated     : ${migratedImagesCount}`);
  log(` Already Cloudinary  : ${skippedCount}`);
  log(` Missing Local Files : ${missingFilesCount}`);
  log(` Mode                : ${dryRun ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  log(`========================================\n`);

  await mongoose.disconnect();
}

// CLI execution: node server/scripts/migrate-images-to-cloudinary.js [--dry-run]
if (process.argv[1] && /migrate-images-to-cloudinary\.js$/.test(process.argv[1])) {
  const isDryRun = process.argv.includes('--dry-run');
  migrateImagesToCloudinary({ dryRun: isDryRun })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
