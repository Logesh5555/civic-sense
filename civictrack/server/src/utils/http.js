export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const ok = (res, data = {}, status = 200, meta) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export const notFound = (req, res) =>
  res.status(404).json({ success: false, error: { message: 'Route not found' } });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.expose ? err.message : 'Internal server error';
  let details = err.details;
  if (err.name === 'ValidationError' && err.errors) {
    status = 400; message = 'Validation failed';
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === 'CastError') {
    status = 400; message = 'Invalid identifier';
  } else if (err.code === 11000) {
    status = 409; message = 'A record with this value already exists';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the maximum allowed size' : 'Invalid upload';
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Malformed JSON body';
  }
  if (status >= 500) console.error(err); // server log only; never sent to client
  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
};
