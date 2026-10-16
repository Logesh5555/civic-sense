import { Counter, Complaint, Notification, User } from '../models/index.js';
import { TRANSITIONS, REASON_REQUIRED, CATEGORIES } from '../utils/constants.js';
import { AppError } from '../utils/http.js';
import { notify, notifyMany } from './notifications.js';

export const STATUS_LABELS = {
  submitted: 'Submitted', under_review: 'Under Review', assigned: 'Assigned',
  in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected', reopened: 'Reopened',
};

export async function nextReferenceNumber() {
  const year = new Date().getFullYear();
  const c = await Counter.findOneAndUpdate({ _id: `complaint-${year}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `CT-${year}-${String(c.seq).padStart(6, '0')}`;
}

export const suggestPriority = (category) => CATEGORIES.find((c) => c.key === category)?.priority || 'medium';

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Applies a status change: validates the transition + reason, appends history, updates resolvedAt.
 * Does NOT save; caller saves. Notifications are sent via `announceStatus` after a successful save.
 */
export function applyStatus(complaint, to, actor, reason) {
  if (!canTransition(complaint.status, to)) {
    throw new AppError(409, `Invalid status transition: ${complaint.status} → ${to}`);
  }
  if (REASON_REQUIRED.includes(to) && !(reason && reason.trim().length >= 5)) {
    throw new AppError(400, 'Validation failed', { reason: `A reason (min 5 characters) is required for ${STATUS_LABELS[to]}` });
  }
  complaint.statusHistory.push({ from: complaint.status, to, actorId: actor._id, actorName: actor.name, reason: reason || undefined, at: new Date() });
  complaint.status = to;
  if (to === 'resolved') complaint.resolvedAt = new Date();
  if (to === 'reopened') { complaint.resolvedAt = undefined; }
}

export async function announceStatus(complaint, actor, reason) {
  const label = STATUS_LABELS[complaint.status];
  let title = `Complaint ${complaint.referenceNumber}: ${label}`;
  let message = `Status changed to ${label}.`;
  if (complaint.status === 'resolved') message = 'Your complaint has been resolved. Thank you for helping your community.';
  if (complaint.status === 'rejected') message = `Your complaint was rejected. Reason: ${reason || 'not provided'}`;
  if (complaint.status === 'reopened') message = `Complaint reopened. Reason: ${reason}`;
  if (String(complaint.citizenId) !== String(actor._id)) await notify(complaint.citizenId, title, message, complaint._id);
}

/** Can this user view/act on this complaint? Enforced for every complaint route. */
export function canAccess(user, c) {
  if (user.role === 'admin') return true;
  if (user.role === 'citizen') return String(c.citizenId?._id || c.citizenId) === String(user._id);
  return false;
}

export function serializeComplaint(c, user) {
  const o = c.toObject ? c.toObject() : { ...c };
  o.id = String(o._id);
  delete o.__v;
  if (Array.isArray(o.images)) {
    o.images = o.images.map((img) => {
      if (typeof img === 'string') {
        return { url: img, secure_url: img, publicId: null, public_id: null };
      }
      const u = img?.url || img?.secure_url || '';
      const p = img?.publicId || img?.public_id || null;
      return { url: u, secure_url: u, publicId: p, public_id: p };
    });
  }
  o.imageUrl = o.imageUrl || o.images?.[0]?.url || o.images?.[0]?.secure_url || null;
  if (typeof o.resolutionImage === 'string') {
    o.resolutionImage = { url: o.resolutionImage, secure_url: o.resolutionImage, publicId: null, public_id: null };
  } else if (o.resolutionImage && typeof o.resolutionImage === 'object') {
    const ru = o.resolutionImage.url || o.resolutionImage.secure_url;
    const rp = o.resolutionImage.publicId || o.resolutionImage.public_id || null;
    o.resolutionImage = { url: ru, secure_url: ru, publicId: rp, public_id: rp };
  }
  if (!user || user.role === 'citizen') {
    delete o.internalNotes; delete o.duplicateOf; delete o.suggestedPriority;
    o.statusHistory = (o.statusHistory || []).map(({ from, to, reason, at }) => ({ from, to, reason, at }));
    if (o.citizenId && typeof o.citizenId === 'object' && o.citizenId._id) o.citizenId = o.citizenId._id;
  }
  return o;
}

/** Limited, non-personal view for public reference tracking. */
export function serializePublic(c) {
  const images = (c.images || []).map((img) => (typeof img === 'string' ? img : (img.url || img.secure_url)));
  const primaryUrl = c.imageUrl || images[0] || null;
  const resImg = c.resolutionImage ? (typeof c.resolutionImage === 'string' ? c.resolutionImage : (c.resolutionImage.url || c.resolutionImage.secure_url)) : null;
  return {
    referenceNumber: c.referenceNumber, title: c.title, category: c.category, status: c.status,
    createdAt: c.createdAt, resolvedAt: c.resolvedAt,
    images,
    imageUrl: primaryUrl,
    resolutionImage: resImg,
    department: c.assignedDepartmentId?.name || null,
    timeline: c.statusHistory.map((h) => ({ to: h.to, at: h.at })),
    updates: c.citizenVisibleUpdates.map((u) => ({ message: u.message, at: u.at })),
  };
}

export { User, Complaint, Notification };
