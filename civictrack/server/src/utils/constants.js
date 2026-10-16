export const ROLES = { CITIZEN: 'citizen', ADMIN: 'admin' };

export const CATEGORIES = [
  { key: 'potholes', label: 'Potholes and damaged roads', priority: 'high' },
  { key: 'garbage', label: 'Garbage and waste management', priority: 'medium' },
  { key: 'streetlights', label: 'Broken streetlights', priority: 'medium' },
  { key: 'drainage', label: 'Drainage and sewage', priority: 'high' },
  { key: 'water', label: 'Water supply and leakage', priority: 'high' },
  { key: 'property', label: 'Public property damage', priority: 'low' },
  { key: 'traffic', label: 'Traffic signs and road safety', priority: 'high' },
  { key: 'other', label: 'Other civic issues', priority: 'low' },
];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'reopened'];
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];

/** Backend-defined workflow. Key = current status, value = allowed next statuses. */
export const TRANSITIONS = {
  submitted: ['under_review', 'in_progress', 'rejected'],
  under_review: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'under_review', 'rejected'],
  resolved: ['reopened'],
  rejected: ['reopened'],
  reopened: ['under_review', 'in_progress', 'rejected'],
};

export const STAFF_STATUSES = [];
/** Statuses that require a reason. */
export const REASON_REQUIRED = ['rejected', 'reopened'];

export const REGIONS = [
  'Central Zone (Anna Nagar)',
  'Downtown Zone (T. Nagar)',
  'South Zone (Adyar)',
  'East Zone (Velachery)',
  'North Zone (Perambur)',
  'West Zone (Tambaram)',
  'Industrial Zone (Guindy)',
  'Heritage Zone (Mylapore)',
];
