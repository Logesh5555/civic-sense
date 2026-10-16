import mongoose from 'mongoose';
import { ROLES, CATEGORY_KEYS, STATUSES, PRIORITIES } from '../utils/constants.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CITIZEN, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);
userSchema.index({ name: 'text', email: 'text' });
userSchema.index(
  { region: 1 },
  { unique: true, partialFilterExpression: { role: 'admin', region: { $exists: true, $type: 'string' } }, name: 'unique_admin_region' }
);
userSchema.methods.toSafe = function () {
  return {
    id: this._id, name: this.name, email: this.email, phone: this.phone, role: this.role,
    departmentId: this.departmentId, region: this.region, isActive: this.isActive, createdAt: this.createdAt,
  };
};

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    contact: { email: { type: String, trim: true }, phone: { type: String, trim: true } },
    isActive: { type: Boolean, default: true },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
  },
  { _id: false }
);

const complaintSchema = new Schema(
  {
    referenceNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, enum: CATEGORY_KEYS, required: true, index: true },
    locationDescription: { type: String, required: true, trim: true, maxlength: 300 },
    region: { type: String, trim: true, index: true },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined }, // [longitude, latitude]
    },
    images: {
      type: [imageSchema],
      set: (val) => {
        if (Array.isArray(val)) {
          return val.map((img) => (typeof img === 'string' ? { url: img, publicId: null } : img));
        }
        return val;
      },
      default: [],
    },
    citizenId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: STATUSES, default: 'submitted', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium', index: true },
    suggestedPriority: { type: String, enum: PRIORITIES },
    duplicateOf: { type: Schema.Types.ObjectId, ref: 'Complaint', default: null },
    statusHistory: [
      {
        _id: false,
        from: String,
        to: String,
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorName: String,
        reason: String,
        at: { type: Date, default: Date.now },
      },
    ],
    citizenVisibleUpdates: [
      { _id: false, message: String, authorName: String, authorRole: String, at: { type: Date, default: Date.now } },
    ],
    internalNotes: [
      { _id: false, message: String, authorId: { type: Schema.Types.ObjectId, ref: 'User' }, authorName: String, at: { type: Date, default: Date.now } },
    ],
    resolutionDetails: { type: String, maxlength: 2000 },
    resolutionImage: {
      type: Schema.Types.Mixed,
      set: (val) => (typeof val === 'string' ? { url: val, publicId: null } : val),
      default: null,
    },
    resolvedAt: { type: Date },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Backward-compatible hook: seamlessly cast string image paths to { url, publicId: null }
complaintSchema.pre('validate', function (next) {
  if (Array.isArray(this.images)) {
    this.images = this.images.map((img) => (typeof img === 'string' ? { url: img, publicId: null } : img));
  }
  if (typeof this.resolutionImage === 'string') {
    this.resolutionImage = { url: this.resolutionImage, publicId: null };
  }
  next();
});

complaintSchema.post('init', function (doc) {
  if (Array.isArray(doc.images)) {
    doc.images = doc.images.map((img) => (typeof img === 'string' ? { url: img, publicId: null } : img));
  }
  if (typeof doc.resolutionImage === 'string') {
    doc.resolutionImage = { url: doc.resolutionImage, publicId: null };
  }
});
complaintSchema.index({ location: '2dsphere' }, { sparse: true });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ title: 'text', description: 'text', referenceNumber: 'text' });

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);
export const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
