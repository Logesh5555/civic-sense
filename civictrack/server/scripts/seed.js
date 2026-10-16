import mongoose from 'mongoose';
import { User, Department, Complaint, Notification, Counter } from '../src/models/index.js';

const DEPTS = [
  ['Roads & Highways', 'Road repair, potholes, traffic signage and road safety', ['potholes', 'traffic']],
  ['Sanitation & Waste', 'Garbage collection, illegal dumping and street cleaning', ['garbage', 'property']],
  ['Water & Drainage', 'Water supply, pipe leakage, drains and sewage management', ['water', 'drainage']],
  ['Electrical & Lighting', 'Street lighting, public electrical fixtures and signals', ['streetlights', 'other']],
];

export async function clearDemoData({ log = console.log } = {}) {
  // Wipe all demo complaints, notifications, demo users and demo departments
  await Notification.deleteMany({});
  await Complaint.deleteMany({});
  await User.deleteMany({ isDemo: true });
  await Department.deleteMany({ isDemo: true });
  await Counter.deleteMany({});

  // Ensure standard municipal departments exist (without demo tag)
  for (const [name, description] of DEPTS) {
    const existing = await Department.findOne({ name });
    if (!existing) {
      await Department.create({
        name,
        description,
        contact: { email: `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.gov`, phone: '1800-111-222' },
        isActive: true,
        isDemo: false,
      });
    }
  }

  log('Removed all demo complaints and demo accounts. Base municipal departments initialized.');
}

// Keep seedDemo as alias to clearDemoData for backward compatibility
export const seedDemo = clearDemoData;

// CLI: node scripts/seed.js
if (process.argv[1] && /seed\.js$/.test(process.argv[1])) {
  const { config } = await import('../src/config/index.js');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  await clearDemoData();
  await mongoose.disconnect();
}
