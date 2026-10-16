import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Department, User } from '../models/index.js';
import { AppError, asyncHandler, ok } from '../utils/http.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function activeAdminCountExcluding(id) {
  return User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: id } });
}

async function assertDept(id) {
  const d = await Department.findOne({ _id: id, isActive: true });
  if (!d) throw new AppError(400, 'Department must exist and be active');
}

async function load(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Invalid user id');
  const u = await User.findById(id);
  if (!u) throw new AppError(404, 'User not found');
  return u;
}

export const listUsers = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const filter = {};
  if (q.role) filter.role = q.role;
  if (q.active) filter.isActive = q.active === 'true';
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), 'i'); filter.$or = [{ name: rx }, { email: rx }]; }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    User.countDocuments(filter),
  ]);
  ok(res, { items: items.map((u) => u.toSafe()) }, 200, { page: q.page, limit: q.limit, total, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

export const getUser = asyncHandler(async (req, res) => {
  const u = await load(req.params.id);
  ok(res, { user: u.toSafe() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const u = await load(req.params.id);
  const { name, phone, isActive, departmentId } = req.body;
  if (isActive === false && u.role === 'admin' && u.isActive && (await activeAdminCountExcluding(u._id)) === 0) throw new AppError(409, 'Cannot deactivate the last active administrator');
  if (isActive === false && String(u._id) === String(req.user._id)) throw new AppError(409, 'You cannot deactivate your own account');
  if (name !== undefined) u.name = name;
  if (phone !== undefined) u.phone = phone || undefined;
  if (isActive !== undefined) u.isActive = isActive;
  if (departmentId !== undefined) {
    if (u.role !== 'staff') throw new AppError(400, 'Only staff can belong to a department');
    if (departmentId) await assertDept(departmentId);
    else throw new AppError(400, 'Staff must belong to a department');
    u.departmentId = departmentId;
  }
  await u.save();
  ok(res, { user: u.toSafe() });
});

export const changeRole = asyncHandler(async (req, res) => {
  const u = await load(req.params.id);
  const { role, departmentId } = req.body;
  if (u.role === 'admin' && role !== 'admin' && (await activeAdminCountExcluding(u._id)) === 0) throw new AppError(409, 'Cannot remove the last administrator');
  if (String(u._id) === String(req.user._id) && role !== 'admin') throw new AppError(409, 'You cannot change your own role');
  if (role === 'staff') {
    if (!departmentId) throw new AppError(400, 'Validation failed', { departmentId: 'Department is required for staff' });
    await assertDept(departmentId);
    u.departmentId = departmentId;
  } else {
    u.departmentId = null;
  }
  u.role = role;
  await u.save();
  ok(res, { user: u.toSafe() });
});

/** Admin creates staff accounts (no public staff/admin registration exists). */
export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, phone, password, departmentId } = req.body;
  await assertDept(departmentId);
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists');
  const u = await User.create({ name, email, phone, role: 'staff', departmentId, passwordHash: await bcrypt.hash(password, 12) });
  ok(res, { user: u.toSafe() }, 201);
});

export const listDepartmentStaff = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Invalid id');
  const items = await User.find({ role: 'staff', departmentId: req.params.id, isActive: true }).select('name email');
  ok(res, { items: items.map((u) => ({ id: u._id, name: u.name, email: u.email })) });
});
