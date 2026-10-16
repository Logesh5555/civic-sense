import mongoose from 'mongoose';
import { Complaint, Department, Notification, User } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/http.js';
import { buildDateRange } from '../services/stats.js';
import { notify, notifyAdmins, notifyMany } from '../services/notifications.js';
import { deleteUploadedImage } from '../services/storage.js';
import {
  announceStatus, applyStatus, canAccess, nextReferenceNumber, serializeComplaint,
  serializePublic, suggestPriority, STATUS_LABELS,
} from '../services/workflow.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRIORITY_ORDER = { low: 1, medium: 2, high: 3, critical: 4 };

async function loadAccessible(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid complaint id');
  const c = await Complaint.findById(req.params.id);
  // 404 (not 403) for inaccessible records so ids can't be enumerated.
  if (!c || !canAccess(req.user, c)) throw new AppError(404, 'Complaint not found');
  return c;
}

/** Visibility scope injected by role — never from client input. */
function scopeFilter(user) {
  if (user.role === 'admin') return {};
  return { citizenId: user._id };
}

export function buildFilter(user, q) {
  const f = [scopeFilter(user)];
  if (q.status) f.push({ status: q.status });
  if (q.category) f.push({ category: q.category });
  if (q.priority) f.push({ priority: q.priority });
  if (q.department && user.role === 'admin') f.push({ assignedDepartmentId: new mongoose.Types.ObjectId(q.department) });
  const range = buildDateRange(q.from, q.to);
  if (range) f.push({ createdAt: range });
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    f.push({ $or: [{ title: rx }, { referenceNumber: rx }, { locationDescription: rx }, { description: rx }] });
  }
  return f.length === 1 ? f[0] : { $and: f };
}

const sortSpec = (s) => {
  const dir = s.startsWith('-') ? -1 : 1;
  const key = s.replace('-', '');
  return { [key]: dir, _id: -1 };
};

const LIST_SELECT = '-internalNotes -statusHistory -citizenVisibleUpdates -description';

export const createComplaint = asyncHandler(async (req, res) => {
  const { latitude, longitude, ...rest } = req.body;
  const suggested = suggestPriority(rest.category);
  let complaint;
  try {
    complaint = await Complaint.create({
      ...rest,
      referenceNumber: await nextReferenceNumber(),
      citizenId: req.user._id, // from session only
      images: req.uploadedImages || [],
      priority: suggested,
      suggestedPriority: suggested,
      ...(latitude !== undefined ? { location: { type: 'Point', coordinates: [longitude, latitude] } } : {}),
      statusHistory: [{ from: null, to: 'submitted', actorId: req.user._id, actorName: req.user.name }],
    });
  } catch (err) {
    // If database save fails, clean up any uploaded Cloudinary assets to avoid orphaned files
    if (Array.isArray(req.uploadedImages)) {
      for (const img of req.uploadedImages) {
        if (img?.publicId) deleteUploadedImage(img.publicId).catch(() => {});
      }
    }
    throw err;
  }
  await notify(req.user._id, `Complaint ${complaint.referenceNumber} submitted`, 'We have received your report. You can track its progress at any time.', complaint._id);
  await notifyAdmins('New complaint', `${complaint.referenceNumber}: ${complaint.title}`, complaint._id);
  ok(res, { complaint: serializeComplaint(complaint, req.user) }, 201);
});

export const listComplaints = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = buildFilter(req.user, q);
  let rows; let total;
  if (q.sort.replace('-', '') === 'priority') {
    // priority is an enum string; sort by rank in-memory page via aggregation
    const dir = q.sort.startsWith('-') ? -1 : 1;
    const agg = await Complaint.aggregate([
      { $match: filter },
      { $addFields: { _rank: { $switch: { branches: Object.entries(PRIORITY_ORDER).map(([k, v]) => ({ case: { $eq: ['$priority', k] }, then: v })), default: 0 } } } },
      { $sort: { _rank: dir, createdAt: -1 } },
      { $skip: (q.page - 1) * q.limit }, { $limit: q.limit },
      { $project: { internalNotes: 0, statusHistory: 0, citizenVisibleUpdates: 0, description: 0, _rank: 0 } },
    ]);
    rows = await Complaint.populate(agg, [{ path: 'assignedDepartmentId', select: 'name' }, { path: 'citizenId', select: 'name email' }]);
    total = await Complaint.countDocuments(filter);
  } else {
    [rows, total] = await Promise.all([
      Complaint.find(filter).select(LIST_SELECT).sort(sortSpec(q.sort)).skip((q.page - 1) * q.limit).limit(q.limit)
        .populate('assignedDepartmentId', 'name').populate('citizenId', 'name email').lean(),
      Complaint.countDocuments(filter),
    ]);
  }
  const items = rows.map((c) => {
    const o = { ...c, id: String(c._id) };
    if (req.user.role === 'citizen') { o.citizenId = String(c.citizenId?._id || c.citizenId); delete o.duplicateOf; delete o.suggestedPriority; }
    return o;
  });
  ok(res, { items }, 200, { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

const csvCell = (v) => {
  let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralize spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportCsv = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.user, req.validatedQuery);
  const rows = await Complaint.find(filter).sort({ createdAt: -1 }).limit(10000)
    .populate('assignedDepartmentId', 'name').populate('citizenId', 'name email').lean();
  const header = ['Reference', 'Title', 'Category', 'Status', 'Priority', 'Citizen', 'Citizen email', 'Department', 'Location', 'Latitude', 'Longitude', 'Submitted', 'Resolved'];
  const lines = [header.map(csvCell).join(',')];
  for (const c of rows) {
    lines.push([
      c.referenceNumber, c.title, c.category, STATUS_LABELS[c.status], c.priority, c.citizenId?.name, c.citizenId?.email,
      c.assignedDepartmentId?.name, c.locationDescription, c.location?.coordinates?.[1], c.location?.coordinates?.[0], c.createdAt, c.resolvedAt,
    ].map(csvCell).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="complaints.csv"');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send('\uFEFF' + lines.join('\r\n'));
});

export const mapComplaints = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.user, req.validatedQuery);
  const rows = await Complaint.find({ $and: [filter, { 'location.coordinates.1': { $exists: true } }] })
    .select('referenceNumber title category status priority location locationDescription createdAt').sort({ createdAt: -1 }).limit(1000).lean();
  ok(res, { items: rows.map((c) => ({ ...c, id: String(c._id) })) });
});

export const getComplaint = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  await c.populate([{ path: 'assignedDepartmentId', select: 'name contact' }, { path: 'assignedStaffId', select: 'name' }, { path: 'citizenId', select: 'name email phone' }]);
  ok(res, { complaint: serializeComplaint(c, req.user) });
});

export const getByReference = asyncHandler(async (req, res) => {
  const ref = String(req.params.referenceNumber).toUpperCase();
  const c = await Complaint.findOne({ referenceNumber: ref }).populate('assignedDepartmentId', 'name');
  if (!c) throw new AppError(404, 'No complaint found with that reference number');
  ok(res, { complaint: serializePublic(c) });
});

export const findDuplicates = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (!c.location?.coordinates?.length) return ok(res, { items: [] });
  const items = await Complaint.find({
    _id: { $ne: c._id }, category: c.category, status: { $nin: ['rejected'] },
    location: { $near: { $geometry: c.location, $maxDistance: 100 } },
  }).select('referenceNumber title status createdAt').limit(10).lean();
  ok(res, { items: items.map((i) => ({ ...i, id: String(i._id) })) });
});

export const updateComplaint = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  const b = req.body;
  if (req.user.role === 'citizen') {
    if (c.status !== 'submitted') throw new AppError(409, 'Complaints can only be edited before review begins');
    if (b.priority || b.category || b.duplicateOf !== undefined) throw new AppError(403, 'You cannot change those fields');
    for (const k of ['title', 'description', 'locationDescription']) if (b[k] !== undefined) c[k] = b[k];
  } else if (req.user.role === 'admin') {
    for (const k of ['title', 'description', 'locationDescription', 'priority', 'category']) if (b[k] !== undefined) c[k] = b[k];
    if (b.duplicateOf !== undefined) {
      if (b.duplicateOf && String(b.duplicateOf) === String(c._id)) throw new AppError(400, 'A complaint cannot duplicate itself');
      c.duplicateOf = b.duplicateOf;
    }
  } else throw new AppError(403, 'You do not have permission to edit complaints');
  await c.save();
  ok(res, { complaint: serializeComplaint(c, req.user) });
});

/** Citizen withdrawal: only while still "submitted" (no one has started work). */
export const withdrawComplaint = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (req.user.role !== 'citizen') throw new AppError(403, 'Only the submitting citizen can withdraw a complaint');
  if (c.status !== 'submitted') throw new AppError(409, 'Only complaints that have not been reviewed can be withdrawn');
  // Clean up any associated Cloudinary assets
  if (Array.isArray(c.images)) {
    for (const img of c.images) {
      if (img?.publicId) deleteUploadedImage(img.publicId).catch(() => {});
    }
  }
  if (c.resolutionImage?.publicId) {
    deleteUploadedImage(c.resolutionImage.publicId).catch(() => {});
  }
  await Notification.deleteMany({ complaintId: c._id });
  await c.deleteOne();
  ok(res, { message: 'Complaint withdrawn' });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (req.user.role === 'citizen') throw new AppError(403, 'You do not have permission to change status');
  const { status, reason, message, resolutionDetails } = req.body;
  const newAfterPhoto = req.uploadedImages?.[0];
  try {
    if (status === 'resolved') {
      if (resolutionDetails) c.resolutionDetails = resolutionDetails;
      if (newAfterPhoto) c.resolutionImage = newAfterPhoto;
    }
    applyStatus(c, status, req.user, reason);
    if (message) c.citizenVisibleUpdates.push({ message, authorName: req.user.name, authorRole: req.user.role });
    await c.save();
  } catch (err) {
    if (newAfterPhoto?.publicId) {
      deleteUploadedImage(newAfterPhoto.publicId).catch(() => {});
    }
    throw err;
  }
  await announceStatus(c, req.user, reason);
  ok(res, { complaint: serializeComplaint(c, req.user) });
});

export const assignComplaint = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  const { departmentId, message } = req.body;
  const dept = await Department.findById(departmentId);
  if (!dept) throw new AppError(404, 'Department not found');
  if (!dept.isActive) throw new AppError(409, 'Department is not active');
  if (['resolved', 'rejected'].includes(c.status)) throw new AppError(409, `Cannot assign a ${c.status} complaint; reopen it first`);
  c.assignedDepartmentId = dept._id;
  if (c.status !== 'assigned' && c.status !== 'in_progress') applyStatus(c, 'assigned', req.user, `Assigned to ${dept.name}`);
  if (message) c.citizenVisibleUpdates.push({ message, authorName: req.user.name, authorRole: 'admin' });
  await c.save();
  await notify(c.citizenId, `Complaint ${c.referenceNumber} assigned`, `Your complaint has been assigned to ${dept.name}.`, c._id);
  await c.populate('assignedDepartmentId', 'name');
  ok(res, { complaint: serializeComplaint(c, req.user) });
});

export const addNote = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (req.user.role === 'citizen') throw new AppError(403, 'You do not have permission to add notes');
  const { message, visibility, requestInfo } = req.body;
  if (visibility === 'citizen') {
    c.citizenVisibleUpdates.push({ message, authorName: req.user.name, authorRole: req.user.role });
  } else {
    c.internalNotes.push({ message, authorId: req.user._id, authorName: req.user.name });
  }
  await c.save();
  if (visibility === 'citizen') {
    await notify(c.citizenId, requestInfo ? `More information requested: ${c.referenceNumber}` : `Update on ${c.referenceNumber}`, message.slice(0, 300), c._id);
  }
  ok(res, { complaint: serializeComplaint(c, req.user) }, 201);
});

export const reopenComplaint = asyncHandler(async (req, res) => {
  const c = await loadAccessible(req);
  if (req.user.role === 'staff') throw new AppError(403, 'Staff cannot reopen complaints');
  applyStatus(c, 'reopened', req.user, req.body.reason);
  await c.save();
  await announceStatus(c, req.user, req.body.reason);
  if (req.user.role === 'citizen') await notifyAdmins(`Complaint reopened: ${c.referenceNumber}`, req.body.reason, c._id);
  ok(res, { complaint: serializeComplaint(c, req.user) });
});
