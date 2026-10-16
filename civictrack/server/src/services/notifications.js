import { Notification, User } from '../models/index.js';
import { config } from '../config/index.js';

export async function notify(userId, title, message, complaintId) {
  if (!userId) return null;
  return Notification.create({ userId, title, message, complaintId });
}

export async function notifyMany(userIds, title, message, complaintId) {
  const unique = [...new Set(userIds.filter(Boolean).map(String))];
  if (!unique.length) return;
  await Notification.insertMany(unique.map((userId) => ({ userId, title, message, complaintId })));
}

export async function notifyAdmins(title, message, complaintId) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await notifyMany(admins.map((a) => a._id), title, message, complaintId);
}

/** Email delivery is optional and disabled unless EMAIL_ENABLED=true plus SMTP settings (see README). */
export async function sendEmail({ to, subject, text }) {
  if (!config.email.enabled) {
    if (!config.isProd && !config.isTest) console.log(`[email disabled] to=${to} subject="${subject}"`);
    return false;
  }
  // Provider hook: install `nodemailer` and send using config.email. Intentionally not bundled.
  console.warn('EMAIL_ENABLED=true but no mail transport is installed; see README "Email".');
  return false;
}
