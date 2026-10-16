import mongoose from 'mongoose';
import { Notification } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/http.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const filter = { userId: req.user._id, ...(req.query.unread === 'true' ? { isRead: false } : {}) };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);
  ok(res, { items: items.map((n) => ({ ...n, id: String(n._id) })), unread }, 200, { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const markRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid id');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true });
  if (!n) throw new AppError(404, 'Notification not found');
  ok(res, { notification: n });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  ok(res, { updated: r.modifiedCount });
});
