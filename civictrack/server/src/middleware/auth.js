import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/index.js';
import { AppError, asyncHandler } from '../utils/http.js';

export const COOKIE_NAME = 'ct_token';

export const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/** Requires a valid cookie; always reloads the user so role/active changes apply immediately. */
export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new AppError(401, 'Authentication required');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError(401, 'Session expired or invalid');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new AppError(401, 'Account unavailable');
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'You do not have permission to perform this action'));
  next();
};
