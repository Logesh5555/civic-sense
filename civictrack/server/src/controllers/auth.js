import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, Department } from '../models/index.js';
import { REGIONS } from '../utils/constants.js';
import { config } from '../config/index.js';
import { AppError, asyncHandler, ok } from '../utils/http.js';
import { COOKIE_NAME, cookieOptions, signToken } from '../middleware/auth.js';
import { sendEmail } from '../services/notifications.js';

const ROUNDS = 12;
// Precomputed hash so login timing doesn't reveal whether an email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

const setSession = (res, user) => res.cookie(COOKIE_NAME, signToken(user), cookieOptions());

export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role = 'citizen', region } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists');

  let finalRole = 'citizen';
  let finalRegion = null;

  if (role === 'admin' && region) {
    if (!REGIONS.includes(region)) {
      throw new AppError(400, 'Invalid municipal region selected', { region: 'Please select a valid municipal region' });
    }
    const existingAdmin = await User.findOne({ role: 'admin', region });
    if (existingAdmin) {
      throw new AppError(409, `An administrator is already registered for "${region}". Only one administrator is allowed per region.`, {
        region: `An administrator is already registered for "${region}". Only one administrator is allowed per region.`,
      });
    }
    finalRole = 'admin';
    finalRegion = region;
  } else if (role === 'admin' && !region) {
    // If client attempts role: 'admin' without valid region, ignore privilege escalation
    finalRole = 'citizen';
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: await bcrypt.hash(password, ROUNDS),
    role: finalRole,
    region: finalRegion,
  });
  setSession(res, user);
  ok(res, { user: user.toSafe() }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, 'Invalid email or password');
  if (!user.isActive) throw new AppError(403, 'This account has been deactivated');

  if (role && user.role !== role) {
    const roleLabels = { citizen: 'Citizen', admin: 'Administrator' };
    throw new AppError(403, `This account is registered as a ${roleLabels[user.role] || user.role}. Please select "${roleLabels[user.role] || user.role} Login".`);
  }

  setSession(res, user);
  ok(res, { user: user.toSafe() });
});

export const getRegistrationOptions = asyncHandler(async (req, res) => {
  const depts = await Department.find({ isActive: true }).select('name description');
  const admins = await User.find({ role: 'admin', isActive: true }).select('region name');
  const assignedMap = new Map(admins.map((a) => [a.region, a.name]));

  const regionsData = REGIONS.map((regionName) => ({
    name: regionName,
    isAssigned: assignedMap.has(regionName),
    adminName: assignedMap.get(regionName) || null,
  }));

  ok(res, {
    departments: depts.map((d) => ({ id: d._id, name: d.name, description: d.description })),
    regions: regionsData,
  });
});

export const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  ok(res, { message: 'Logged out' });
};

export const me = (req, res) => ok(res, { user: req.user.toSafe() });

export const updateProfile = asyncHandler(async (req, res) => {
  if (req.body.name !== undefined) req.user.name = req.body.name;
  if (req.body.phone !== undefined) req.user.phone = req.body.phone || undefined;
  await req.user.save();
  ok(res, { user: req.user.toSafe() });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw new AppError(400, 'Validation failed', { currentPassword: 'Current password is incorrect' });
  user.passwordHash = await bcrypt.hash(req.body.newPassword, ROUNDS);
  await user.save();
  ok(res, { message: 'Password updated' });
});

/**
 * Password reset: a random token is emailed (when email is configured); only its SHA-256 hash is stored.
 * Without email credentials, the reset link is printed to the SERVER console in development only.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const generic = { message: 'If an account exists for that email, reset instructions have been sent.' };
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (!user) return ok(res, generic);
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const link = `${config.clientUrl}/reset-password?token=${token}`;
  const sent = await sendEmail({ to: user.email, subject: 'CivicTrack password reset', text: `Reset your password (valid 30 minutes): ${link}` });
  if (!sent && !config.isProd && !config.isTest) console.log(`[dev] Password reset link for ${user.email}: ${link}`);
  ok(res, config.isTest ? { ...generic, _testToken: token } : generic);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const hash = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({ passwordResetTokenHash: hash, passwordResetExpires: { $gt: new Date() } }).select('+passwordResetTokenHash +passwordResetExpires');
  if (!user) throw new AppError(400, 'Reset link is invalid or has expired');
  user.passwordHash = await bcrypt.hash(req.body.password, ROUNDS);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  ok(res, { message: 'Password has been reset. You can now log in.' });
});
