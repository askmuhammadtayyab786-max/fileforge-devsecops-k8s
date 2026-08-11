const mongoose = require('mongoose');

/**
 * Fixes: "No audit logging of who uploaded/deleted what" (Repudiation)
 * Every mutating file operation writes one of these, so actions can be traced
 * back to an authenticated user + IP + time.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['upload', 'download', 'delete'],
      required: true,
      index: true,
    },
    fileId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    username: String,
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
