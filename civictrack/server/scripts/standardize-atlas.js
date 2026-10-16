import mongoose from 'mongoose';
import { config } from '../src/config/index.js';

await mongoose.connect(config.mongoUri);
const col = mongoose.connection.db.collection('complaints');
const docs = await col.find().toArray();

for (const d of docs) {
  if (d.images && d.images.length > 0) {
    const first = d.images[0];
    const url = typeof first === 'object' ? (first.url || first.secure_url) : first;
    const pid = typeof first === 'object' ? (first.publicId || first.public_id) : null;
    
    const updatedImages = d.images.map((img) => {
      if (typeof img === 'string') {
        return { url: img, secure_url: img, publicId: null, public_id: null };
      }
      const u = img.url || img.secure_url;
      const p = img.publicId || img.public_id;
      return { url: u, secure_url: u, publicId: p, public_id: p };
    });

    await col.updateOne(
      { _id: d._id },
      { $set: { imageUrl: url, images: updatedImages } }
    );
    console.log(`[✓] Standardized ${d.referenceNumber}: imageUrl=${url}`);
  }
}

await mongoose.disconnect();
