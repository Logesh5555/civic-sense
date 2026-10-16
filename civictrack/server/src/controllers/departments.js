import mongoose from 'mongoose';
import { Complaint, Department, User } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/http.js';

const ACTIVE = ['submitted', 'under_review', 'assigned', 'in_progress', 'reopened'];

export const listDepartments = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { isActive: true };
  const depts = await Department.find(filter).sort({ name: 1 }).lean();
  let counts = [];
  let staff = [];
  if (req.user.role === 'admin') {
    [counts, staff] = await Promise.all([
      Complaint.aggregate([{ $match: { assignedDepartmentId: { $ne: null } } }, { $group: { _id: '$assignedDepartmentId', total: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ['$status', ACTIVE] }, 1, 0] } } } }]),
      User.aggregate([{ $match: { role: 'staff', departmentId: { $ne: null } } }, { $group: { _id: '$departmentId', n: { $sum: 1 } } }]),
    ]);
  }
  const cm = new Map(counts.map((c) => [String(c._id), c]));
  const sm = new Map(staff.map((c) => [String(c._id), c.n]));
  ok(res, { items: depts.map((d) => ({ ...d, id: String(d._id), complaintCount: cm.get(String(d._id))?.total || 0, activeCount: cm.get(String(d._id))?.active || 0, staffCount: sm.get(String(d._id)) || 0 })) });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const d = await Department.create(req.body);
  ok(res, { department: d }, 201);
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const d = await Department.findById(req.params.id);
  if (!d) throw new AppError(404, 'Department not found');
  Object.assign(d, req.body);
  if (req.body.isActive === false) {
    // allowed: existing assignments keep working; new assignments are blocked by assign endpoint.
  }
  await d.save();
  ok(res, { department: d });
});

/**
 * Safe delete: refuses while active complaints are assigned unless `?reassignTo=<departmentId>`
 * is supplied, in which case all complaints and staff are moved to that active department first.
 */
export const deleteDepartment = asyncHandler(async (req, res) => {
  const d = await Department.findById(req.params.id);
  if (!d) throw new AppError(404, 'Department not found');
  const activeCount = await Complaint.countDocuments({ assignedDepartmentId: d._id, status: { $in: ACTIVE } });
  const staffCount = await User.countDocuments({ departmentId: d._id });
  const { reassignTo } = req.query;
  if (activeCount > 0 || staffCount > 0) {
    if (!reassignTo) throw new AppError(409, `Department has ${activeCount} active complaint(s) and ${staffCount} staff member(s). Provide reassignTo to move them first, or deactivate instead.`);
    if (!mongoose.isValidObjectId(reassignTo) || String(reassignTo) === String(d._id)) throw new AppError(400, 'Invalid reassignTo department');
    const target = await Department.findOne({ _id: reassignTo, isActive: true });
    if (!target) throw new AppError(400, 'Target department must exist and be active');
    await Complaint.updateMany({ assignedDepartmentId: d._id }, { assignedDepartmentId: target._id, assignedStaffId: null });
    await User.updateMany({ departmentId: d._id }, { departmentId: target._id });
  } else {
    await Complaint.updateMany({ assignedDepartmentId: d._id }, { assignedDepartmentId: null });
  }
  await d.deleteOne();
  ok(res, { message: 'Department deleted' });
});
