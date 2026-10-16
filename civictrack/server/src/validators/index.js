import { z } from 'zod';
import { CATEGORY_KEYS, STATUSES, PRIORITIES } from '../utils/constants.js';

const strip = (s) => (typeof s === 'string' ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim() : s);
const text = (min, max, label) =>
  z.preprocess(strip, z.string({ required_error: `${label} is required` }).min(min, `${label} must be at least ${min} characters`).max(max, `${label} must be at most ${max} characters`));
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const optionalId = z.preprocess((v) => (v === '' ? undefined : v), objectId.optional());
const optionalNum = (min, max, label) =>
  z.preprocess((v) => (v === '' || v === undefined || v === null ? undefined : Number(v)), z.number({ invalid_type_error: `${label} must be a number` }).min(min, `${label} out of range`).max(max, `${label} out of range`).optional());

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const email = z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), z.string({ required_error: 'Email is required' }).email('Enter a valid email').max(120));
const phone = z.preprocess((v) => (v === '' || v == null ? undefined : strip(v)), z.string().regex(/^[0-9+()\-\s]{7,20}$/, 'Enter a valid phone number').optional());

export const registerSchema = z.object({
  name: text(2, 80, 'Name'),
  email,
  phone,
  password: passwordSchema,
  role: z.enum(['citizen', 'admin']).optional(),
  departmentId: optionalId,
  region: z.string().max(100).optional(),
});
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(200),
  role: z.enum(['citizen', 'admin']).optional(),
});
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });
export const profileSchema = z.object({ name: text(2, 80, 'Name').optional(), phone: z.preprocess((v) => (v === '' ? null : strip(v)), z.union([z.null(), z.string().regex(/^[0-9+()\-\s]{7,20}$/, 'Enter a valid phone number')]).optional()) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: passwordSchema });

export const createComplaintSchema = z.object({
  title: text(5, 120, 'Title'),
  description: text(10, 2000, 'Description'),
  category: z.enum(CATEGORY_KEYS, { errorMap: () => ({ message: 'Select a valid category' }) }),
  locationDescription: text(3, 300, 'Location description'),
  latitude: optionalNum(-90, 90, 'Latitude'),
  longitude: optionalNum(-180, 180, 'Longitude'),
  imageUrl: z.string().optional(),
  images: z.any().optional(),
}).passthrough().refine((d) => (d.latitude === undefined) === (d.longitude === undefined), { message: 'Provide both latitude and longitude, or neither', path: ['latitude'] });

export const updateComplaintSchema = z.object({
  title: text(5, 120, 'Title').optional(),
  description: text(10, 2000, 'Description').optional(),
  locationDescription: text(3, 300, 'Location description').optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORY_KEYS).optional(),
  duplicateOf: z.preprocess((v) => (v === '' ? null : v), z.union([objectId, z.null()]).optional()),
});

export const statusSchema = z.object({
  status: z.enum(STATUSES),
  reason: z.preprocess(strip, z.string().max(500).optional()),
  message: z.preprocess(strip, z.string().max(1000).optional()),
  resolutionDetails: z.preprocess(strip, z.string().max(2000).optional()),
});
export const assignSchema = z.object({ departmentId: objectId, staffId: optionalId, message: z.preprocess(strip, z.string().max(500).optional()) });
export const noteSchema = z.object({
  message: text(2, 1000, 'Message'),
  visibility: z.enum(['internal', 'citizen']).default('internal'),
  requestInfo: z.boolean().optional(),
});
export const reopenSchema = z.object({ reason: text(5, 500, 'Reason') });

const page = z.preprocess((v) => parseInt(v, 10) || 1, z.number().int().min(1).max(100000));
const limit = z.preprocess((v) => parseInt(v, 10) || 10, z.number().int().min(1).max(100));
const optStr = (max = 100) => z.preprocess((v) => (v === '' ? undefined : v), z.string().max(max).optional());
export const complaintQuerySchema = z.object({
  page, limit,
  q: optStr(100),
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(STATUSES).optional()),
  category: z.preprocess((v) => (v === '' ? undefined : v), z.enum(CATEGORY_KEYS).optional()),
  priority: z.preprocess((v) => (v === '' ? undefined : v), z.enum(PRIORITIES).optional()),
  department: z.preprocess((v) => (v === '' ? undefined : v), objectId.optional()),
  from: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional()),
  to: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional()),
  sort: z.enum(['createdAt', '-createdAt', 'priority', '-priority', 'status', '-status', 'title', '-title']).default('-createdAt'),
});
export const rangeQuerySchema = z.object({
  from: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional()),
  to: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional()),
  category: z.preprocess((v) => (v === '' ? undefined : v), z.enum(CATEGORY_KEYS).optional()),
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(STATUSES).optional()),
});

export const departmentSchema = z.object({
  name: text(2, 100, 'Name'),
  description: z.preprocess(strip, z.string().max(500).optional()),
  contact: z.object({ email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()), phone: z.preprocess((v) => (v === '' ? undefined : v), z.string().max(20).optional()) }).optional(),
  isActive: z.boolean().optional(),
});
export const departmentUpdateSchema = departmentSchema.partial();

export const userQuerySchema = z.object({
  page, limit, q: optStr(100),
  role: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['citizen', 'admin']).optional()),
  active: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['true', 'false']).optional()),
});
export const userUpdateSchema = z.object({
  name: text(2, 80, 'Name').optional(),
  phone: profileSchema.shape.phone,
  isActive: z.boolean().optional(),
  departmentId: z.union([objectId, z.null()]).optional(),
});
export const roleSchema = z.object({ role: z.enum(['citizen', 'admin']), region: z.string().max(100).optional() });
