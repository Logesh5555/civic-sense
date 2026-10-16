import {
  Construction, Trash2, Lightbulb, Waves, Droplets, Building2, TrafficCone, CircleHelp,
} from 'lucide-react';

export const CATEGORIES = [
  { key: 'potholes', label: 'Potholes and damaged roads', short: 'Potholes', icon: Construction, priority: 'high' },
  { key: 'garbage', label: 'Garbage and waste management', short: 'Garbage', icon: Trash2, priority: 'medium' },
  { key: 'streetlights', label: 'Broken streetlights', short: 'Streetlights', icon: Lightbulb, priority: 'medium' },
  { key: 'drainage', label: 'Drainage and sewage', short: 'Drainage', icon: Waves, priority: 'high' },
  { key: 'water', label: 'Water supply and leakage', short: 'Water', icon: Droplets, priority: 'high' },
  { key: 'property', label: 'Public property damage', short: 'Property', icon: Building2, priority: 'low' },
  { key: 'traffic', label: 'Traffic signs and road safety', short: 'Traffic', icon: TrafficCone, priority: 'high' },
  { key: 'other', label: 'Other civic issues', short: 'Other', icon: CircleHelp, priority: 'low' },
];
export const categoryLabel = (k) => CATEGORIES.find((c) => c.key === k)?.label || k;
export const categoryShort = (k) => CATEGORIES.find((c) => c.key === k)?.short || k;

export const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'reopened'];
export const STATUS_META = {
  submitted: { label: 'Submitted', cls: 'bg-slate-100 text-slate-700 ring-slate-300', color: '#64748b' },
  under_review: { label: 'Under Review', cls: 'bg-amber-50 text-amber-800 ring-amber-300', color: '#d97706' },
  assigned: { label: 'Assigned', cls: 'bg-blue-50 text-blue-800 ring-blue-300', color: '#2563eb' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-800 ring-indigo-300', color: '#4f46e5' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-300', color: '#059669' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-800 ring-red-300', color: '#dc2626' },
  reopened: { label: 'Reopened', cls: 'bg-orange-50 text-orange-800 ring-orange-300', color: '#ea580c' },
};
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITY_META = {
  low: 'bg-slate-100 text-slate-700 ring-slate-300',
  medium: 'bg-sky-50 text-sky-800 ring-sky-300',
  high: 'bg-orange-50 text-orange-800 ring-orange-300',
  critical: 'bg-red-50 text-red-800 ring-red-300',
};

export const TRANSITIONS = {
  submitted: ['under_review', 'in_progress', 'rejected'],
  under_review: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'under_review', 'rejected'],
  resolved: ['reopened'],
  rejected: ['reopened'],
  reopened: ['under_review', 'in_progress', 'rejected'],
};
export const STAFF_STATUSES = [];

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
