import { AppError } from '../utils/http.js';

/** Validate+coerce req[source] with a zod schema; replaces it with parsed data. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) details[issue.path.join('.') || '_'] = issue.message;
    return next(new AppError(400, 'Validation failed', details));
  }
  if (source === 'query') {
    req.validatedQuery = result.data;
  } else {
    req[source] = result.data;
  }
  next();
};
