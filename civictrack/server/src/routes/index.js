import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { imageUpload } from '../middleware/upload.js';
import * as V from '../validators/index.js';
import * as auth from '../controllers/auth.js';
import * as cx from '../controllers/complaints.js';
import * as dash from '../controllers/dashboard.js';
import * as dept from '../controllers/departments.js';
import * as users from '../controllers/users.js';
import * as notif from '../controllers/notifications.js';

const limiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, skip: () => config.isTest && !process.env.TEST_RATE_LIMIT, message: { success: false, error: { message } } });

export const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many attempts. Please try again later.');
const complaintLimiter = limiter(60 * 60 * 1000, 20, 'Complaint submission limit reached. Please try again later.');
const publicLimiter = limiter(60 * 1000, 60, 'Too many requests. Please slow down.');

const router = Router();
const A = authenticate;
const admin = authorize('admin');

// Auth
router.get('/auth/registration-options', publicLimiter, auth.getRegistrationOptions);
router.post('/auth/register', authLimiter, validate(V.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(V.loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', A, auth.me);
router.patch('/auth/me', A, validate(V.profileSchema), auth.updateProfile);
router.post('/auth/change-password', A, authLimiter, validate(V.changePasswordSchema), auth.changePassword);
router.post('/auth/forgot-password', authLimiter, validate(V.forgotSchema), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(V.resetSchema), auth.resetPassword);

// Public (non-personal) data
router.get('/public/stats', publicLimiter, dash.publicStats);
router.get('/public/resolved', publicLimiter, dash.publicResolved);
router.get('/complaints/reference/:referenceNumber', publicLimiter, cx.getByReference);

// Complaints (static paths before :id)
router.post('/complaints', A, authorize('citizen'), complaintLimiter, ...imageUpload('images', 3), validate(V.createComplaintSchema), cx.createComplaint);
router.get('/complaints', A, validate(V.complaintQuerySchema, 'query'), cx.listComplaints);
router.get('/complaints/export', A, admin, validate(V.complaintQuerySchema, 'query'), cx.exportCsv);
router.get('/complaints/map', A, admin, validate(V.complaintQuerySchema, 'query'), cx.mapComplaints);
router.get('/complaints/:id', A, cx.getComplaint);
router.get('/complaints/:id/duplicates', A, admin, cx.findDuplicates);
router.patch('/complaints/:id', A, validate(V.updateComplaintSchema), cx.updateComplaint);
router.delete('/complaints/:id', A, cx.withdrawComplaint);
router.patch('/complaints/:id/status', A, admin, ...imageUpload('afterPhoto', 1), validate(V.statusSchema), cx.updateStatus);
router.patch('/complaints/:id/assign', A, admin, validate(V.assignSchema), cx.assignComplaint);
router.post('/complaints/:id/notes', A, admin, validate(V.noteSchema), cx.addNote);
router.post('/complaints/:id/reopen', A, authorize('citizen', 'admin'), validate(V.reopenSchema), cx.reopenComplaint);

// Dashboards & analytics
router.get('/dashboard/citizen', A, authorize('citizen'), dash.citizenDashboard);
router.get('/dashboard/admin', A, admin, validate(V.rangeQuerySchema, 'query'), dash.adminDashboard);
router.get('/analytics/complaints', A, admin, validate(V.rangeQuerySchema, 'query'), dash.complaintAnalytics);
router.get('/analytics/departments', A, admin, validate(V.rangeQuerySchema, 'query'), dash.departmentAnalytics);

// Departments
router.get('/departments', A, dept.listDepartments);
router.post('/departments', A, admin, validate(V.departmentSchema), dept.createDepartment);
router.patch('/departments/:id', A, admin, validate(V.departmentUpdateSchema), dept.updateDepartment);
router.delete('/departments/:id', A, admin, dept.deleteDepartment);

// Users
router.get('/users', A, admin, validate(V.userQuerySchema, 'query'), users.listUsers);
router.get('/users/:id', A, admin, users.getUser);
router.patch('/users/:id', A, admin, validate(V.userUpdateSchema), users.updateUser);
router.patch('/users/:id/role', A, admin, validate(V.roleSchema), users.changeRole);

// Notifications
router.get('/notifications', A, notif.listNotifications);
router.patch('/notifications/read-all', A, notif.markAllRead);
router.patch('/notifications/:id/read', A, notif.markRead);

export default router;
