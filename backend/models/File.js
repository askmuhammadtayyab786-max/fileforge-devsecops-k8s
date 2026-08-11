const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Fixes: "Uploaded files served publicly, no ownership check" (Information Disclosure)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    storedName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
      default: 'other',
      index: true,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'error'],
      default: 'uploading',
      index: true,
    },
    url: {
      type: String,
    },
    path: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
    },
    // TTL: auto-delete after 7 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for filtering/searching
fileSchema.index({ originalName: 'text' });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ category: 1, status: 1 });

const File = mongoose.model('File', fileSchema);
module.exports = File;
