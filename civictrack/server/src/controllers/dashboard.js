import mongoose from 'mongoose';
import { Complaint, Department, Notification, User } from '../models/index.js';
import { asyncHandler, ok, AppError } from '../utils/http.js';
import { AVG_RESOLUTION_STAGE, buildDateRange, msToHours, resolutionRate, statusCounts } from '../services/stats.js';

const byStatus = (match) => Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]).then(statusCounts);

async function recentNotifications(userId) {
  const [items, unread] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Notification.countDocuments({ userId, isRead: false }),
  ]);
  return { items: items.map((n) => ({ ...n, id: String(n._id) })), unread };
}

export const citizenDashboard = asyncHandler(async (req, res) => {
  const match = { citizenId: req.user._id };
  const counts = await byStatus(match);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const recent = await Complaint.find(match).select('-internalNotes -statusHistory -citizenVisibleUpdates -description').sort({ createdAt: -1 }).limit(5).populate('assignedDepartmentId', 'name').lean();
  ok(res, {
    totals: {
      total,
      pending: counts.submitted + counts.under_review + counts.assigned + counts.reopened,
      inProgress: counts.in_progress,
      resolved: counts.resolved,
      rejected: counts.rejected,
    },
    recent: recent.map((c) => ({ ...c, id: String(c._id) })),
    notifications: await recentNotifications(req.user._id),
  });
});

export const adminDashboard = asyncHandler(async (req, res) => {
  const { from, to } = req.validatedQuery;
  const range = buildDateRange(from, to);
  const match = range ? { createdAt: range } : {};
  const [counts, avg] = await Promise.all([byStatus(match), Complaint.aggregate(AVG_RESOLUTION_STAGE(match))]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  ok(res, {
    kpis: {
      total, new: counts.submitted, underReview: counts.under_review, assigned: counts.assigned, inProgress: counts.in_progress,
      resolved: counts.resolved, rejected: counts.rejected, reopened: counts.reopened,
      resolutionRate: resolutionRate(total, counts.resolved, counts.rejected),
      avgResolutionHours: msToHours(avg[0]?.avgMs),
    },
    definitions: {
      resolutionRate: 'Resolved ÷ (Total − Rejected) × 100, based on current status.',
      avgResolutionTime: 'Mean of (resolved time − submitted time) over currently resolved complaints, in hours.',
    },
  });
});

export const departmentDashboard = asyncHandler(async (req, res) => {
  const u = req.user;
  let match;
  if (u.role === 'admin') {
    if (!req.query.departmentId || !mongoose.isValidObjectId(req.query.departmentId)) throw new AppError(400, 'departmentId is required for administrators');
    match = { assignedDepartmentId: new mongoose.Types.ObjectId(req.query.departmentId) };
  } else {
    match = { $or: [{ assignedStaffId: u._id }, ...(u.departmentId ? [{ assignedDepartmentId: u.departmentId }] : [])] };
  }
  const counts = await byStatus(match);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const avg = await Complaint.aggregate(AVG_RESOLUTION_STAGE(match));
  ok(res, {
    totals: {
      assigned: total, newAssignments: counts.assigned + counts.reopened, inProgress: counts.in_progress, completed: counts.resolved,
      resolutionRate: resolutionRate(total, counts.resolved, counts.rejected), avgResolutionHours: msToHours(avg[0]?.avgMs),
    },
    byStatus: counts,
    notifications: await recentNotifications(u._id),
  });
});

export const complaintAnalytics = asyncHandler(async (req, res) => {
  const { from, to, category, status } = req.validatedQuery;
  const range = buildDateRange(from, to);
  const match = { ...(range ? { createdAt: range } : {}), ...(category ? { category } : {}), ...(status ? { status } : {}) };
  const [overTime, byCategory, byStat, resolutionTrend, locations] = await Promise.all([
    Complaint.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $match: { ...match, status: 'resolved', resolvedAt: { $exists: true } } },
      { $group: { _id: { $dateToString: { format: '%G-W%V', date: '$resolvedAt' } }, resolved: { $sum: 1 }, avgHours: { $avg: { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 36e5] } } } },
      { $sort: { _id: 1 } },
    ]),
    // Volume by ~1km grid cell (0.01° rounding); only cells with data are returned.
    Complaint.aggregate([
      { $match: { ...match, 'location.coordinates.1': { $exists: true } } },
      { $group: { _id: { lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] }, lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] } }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
  ]);
  ok(res, {
    overTime: overTime.map((r) => ({ date: r._id, count: r.count })),
    byCategory: byCategory.map((r) => ({ category: r._id, count: r.count })),
    byStatus: byStat.map((r) => ({ status: r._id, count: r.count })),
    resolutionTrend: resolutionTrend.map((r) => ({ week: r._id, resolved: r.resolved, avgHours: Math.round(r.avgHours * 10) / 10 })),
    locations: locations.map((r) => ({ lat: r._id.lat, lng: r._id.lng, count: r.count })),
  });
});

export const departmentAnalytics = asyncHandler(async (req, res) => {
  const { from, to } = req.validatedQuery;
  const range = buildDateRange(from, to);
  const rows = await Complaint.aggregate([
    { $match: { assignedDepartmentId: { $ne: null }, ...(range ? { createdAt: range } : {}) } },
    {
      $group: {
        _id: '$assignedDepartmentId', total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $in: ['$status', ['assigned', 'in_progress', 'reopened', 'under_review']] }, 1, 0] } },
        avgMs: { $avg: { $cond: [{ $and: [{ $eq: ['$status', 'resolved'] }, { $ifNull: ['$resolvedAt', false] }] }, { $subtract: ['$resolvedAt', '$createdAt'] }, null] } },
      },
    },
  ]);
  const depts = await Department.find().lean();
  const map = new Map(rows.map((r) => [String(r._id), r]));
  ok(res, {
    items: depts.map((d) => {
      const r = map.get(String(d._id)) || { total: 0, resolved: 0, active: 0 };
      return { id: String(d._id), name: d.name, isActive: d.isActive, total: r.total, resolved: r.resolved, active: r.active, resolutionRate: resolutionRate(r.total, r.resolved, 0), avgResolutionHours: msToHours(r.avgMs) };
    }),
  });
});

export const publicStats = asyncHandler(async (req, res) => {
  const [counts, avg, citizens] = await Promise.all([byStatus({}), Complaint.aggregate(AVG_RESOLUTION_STAGE()), User.countDocuments({ role: 'citizen', isActive: true })]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  ok(res, { total, resolved: counts.resolved, inProgress: counts.in_progress, citizens, resolutionRate: resolutionRate(total, counts.resolved, counts.rejected), avgResolutionHours: msToHours(avg[0]?.avgMs) });
});

export const publicResolved = asyncHandler(async (req, res) => {
  const rows = await Complaint.find({ status: 'resolved' }).sort({ resolvedAt: -1 }).limit(6)
    .select('referenceNumber title category resolvedAt createdAt resolutionImage assignedDepartmentId').populate('assignedDepartmentId', 'name').lean();
  ok(res, { items: rows.map((c) => ({ referenceNumber: c.referenceNumber, title: c.title, category: c.category, resolvedAt: c.resolvedAt, createdAt: c.createdAt, department: c.assignedDepartmentId?.name || null, resolutionImage: c.resolutionImage || null })) });
});
