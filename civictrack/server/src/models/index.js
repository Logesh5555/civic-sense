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
    secure_url: { type: String, default: null },
    publicId: { type: String, default: null },
    public_id: { type: String, default: null },
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
    imageUrl: { type: String, default: null },
    images: {
      type: [Schema.Types.Mixed],
      set: (val) => {
        if (!val) return [];
        if (!Array.isArray(val)) val = [val];
        return val.map((img) => {
          if (typeof img === 'string') {
            return { url: img, secure_url: img, publicId: null, public_id: null };
          }
          const u = img?.url || img?.secure_url || '';
          const p = img?.publicId || img?.public_id || null;
          return { url: u, secure_url: u, publicId: p, public_id: p };
        });
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
      set: (val) => {
        if (!val) return null;
        if (typeof val === 'string') return { url: val, secure_url: val, publicId: null, public_id: null };
        const u = val.url || val.secure_url || '';
        const p = val.publicId || val.public_id || null;
        return { url: u, secure_url: u, publicId: p, public_id: p };
      },
      default: null,
    },
    resolvedAt: { type: Date },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Backward-compatible hook: seamlessly populate imageUrl and normalize image paths
complaintSchema.pre('validate', function (next) {
  if (Array.isArray(this.images) && this.images.length > 0) {
    this.images = this.images.map((img) => {
      if (typeof img === 'string') {
        return { url: img, secure_url: img, publicId: null, public_id: null };
      }
      const u = img?.url || img?.secure_url || '';
      const p = img?.publicId || img?.public_id || null;
      return { url: u, secure_url: u, publicId: p, public_id: p };
    });
    const firstUrl = this.images[0]?.url || this.images[0]?.secure_url;
    if (firstUrl) {
      this.imageUrl = firstUrl;
    }
  } else if (this.imageUrl) {
    this.images = [{ url: this.imageUrl, secure_url: this.imageUrl, publicId: null, public_id: null }];
  }
  if (typeof this.resolutionImage === 'string') {
    this.resolutionImage = { url: this.resolutionImage, secure_url: this.resolutionImage, publicId: null, public_id: null };
  } else if (this.resolutionImage && typeof this.resolutionImage === 'object') {
    const ru = this.resolutionImage.url || this.resolutionImage.secure_url;
    const rp = this.resolutionImage.publicId || this.resolutionImage.public_id || null;
    this.resolutionImage.url = ru;
    this.resolutionImage.secure_url = ru;
    this.resolutionImage.publicId = rp;
    this.resolutionImage.public_id = rp;
  }
  next();
});

complaintSchema.post('init', function (doc) {
  if (Array.isArray(doc.images) && doc.images.length > 0) {
    doc.images = doc.images.map((img) => {
      if (typeof img === 'string') {
        return { url: img, secure_url: img, publicId: null, public_id: null };
      }
      const u = img?.url || img?.secure_url || '';
      const p = img?.publicId || img?.public_id || null;
      return { url: u, secure_url: u, publicId: p, public_id: p };
    });
    if (!doc.imageUrl) {
      doc.imageUrl = doc.images[0]?.url || doc.images[0]?.secure_url || null;
    }
  } else if (doc.imageUrl && (!doc.images || doc.images.length === 0)) {
    doc.images = [{ url: doc.imageUrl, secure_url: doc.imageUrl, publicId: null, public_id: null }];
  }
  if (typeof doc.resolutionImage === 'string') {
    doc.resolutionImage = { url: doc.resolutionImage, secure_url: doc.resolutionImage, publicId: null, public_id: null };
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
