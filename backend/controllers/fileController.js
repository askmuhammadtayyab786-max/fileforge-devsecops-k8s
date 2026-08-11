const path = require('node:path');
const fs = require('node:fs');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const AuditLog = require('../models/AuditLog');
const { scanFile } = require('../middleware/scan');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
// Fixes: "Large/many file uploads could exhaust storage" (Denial of Service)
const MAX_USER_QUOTA_BYTES = Number.parseInt(process.env.MAX_USER_QUOTA_BYTES) || 500 * 1024 * 1024; // 500MB/user default
// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('msword') ||
    mimeType.includes('text/') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation')
  ) return 'document';
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('gz') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  ) return 'archive';
  return 'other';
}

// Fixes: "No audit logging of who uploaded/deleted what" (Repudiation)
function audit(req, action, fileId) {
  AuditLog.create({
    action,
    fileId,
    userId: req.user?.id,
    username: req.user?.username,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  }).catch(err => console.error('Audit log write failed:', err.message));
}

function processFile(fileId, filePath) {
  // Real processing step: content-scan the file, then flip status to ready/error.
  setTimeout(async () => {
    try {
      const result = await scanFile(filePath);
      await File.findOneAndUpdate(
        { fileId },
        result.clean
          ? { status: 'ready' }
          : { status: 'error', errorMessage: `Rejected by content scan: ${result.reason}` }
      );
      if (!result.clean) {
        // Quarantine: remove the infected/unscannable file from disk immediately.
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    } catch (err) {
      console.error('Processing error:', err);
      await File.findOneAndUpdate({ fileId }, { status: 'error', errorMessage: 'Processing failed' });
    }
  }, 500);
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/files/upload
 * Fixes: "No authentication/authorization on any API endpoint" (Elevation of Privilege)
 *        "Large/many file uploads could exhaust storage" (Denial of Service)
 */
exports.uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  // Enforce per-user storage quota before persisting metadata.
  const incomingSize = req.files.reduce((sum, f) => sum + f.size, 0);
  const [{ totalSize = 0 } = {}] = await File.aggregate([
    { $match: { owner: req.user.id } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);

  if (totalSize + incomingSize > MAX_USER_QUOTA_BYTES) {
    // Clean up the files multer already wrote to disk before rejecting.
    req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
    return res.status(413).json({
      success: false,
      message: `Storage quota exceeded. Limit is ${(MAX_USER_QUOTA_BYTES / 1024 / 1024).toFixed(0)}MB per user.`,
    });
  }

  const tags = req.body.tags
    ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  const savedFiles = [];

  for (const file of req.files) {
    const fileId = uuidv4();
    const category = getCategory(file.mimetype);
    const url = `/uploads/${file.filename}`;

    const doc = await File.create({
      fileId,
      owner: req.user.id,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      category,
      status: 'processing',
      url,
      path: file.path,
      tags,
    });

    processFile(fileId, file.path);
    audit(req, 'upload', fileId);
    savedFiles.push(doc);
  }

  res.status(201).json({
    success: true,
    message: `${savedFiles.length} file(s) uploaded successfully`,
    data: { files: savedFiles },
  });
};

/**
 * GET /api/files
 * Fixes: "Uploaded files served publicly, no ownership check" (Information Disclosure)
 * Non-admin users only ever see their own files.
 */
exports.getFiles = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    search,
    sort = '-createdAt',
  } = req.query;

  const query = req.user.role === 'admin' ? {} : { owner: req.user.id };
  if (category && category !== 'all') query.category = category;
  if (status && status !== 'all') query.status = status;
  if (search) query.$text = { $search: search };

  const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);
  const [files, total] = await Promise.all([
    File.find(query).sort(sort).skip(skip).limit(Number.parseInt(limit)).lean(),
    File.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      files,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / Number.parseInt(limit)),
      },
    },
  });
};

// Shared ownership guard used by getFile / downloadFile / deleteFile.
async function findOwnedFile(req, res) {
  const file = await File.findOne({ fileId: req.params.fileId });
  if (!file) {
    res.status(404).json({ success: false, message: 'File not found' });
    return null;
  }
  if (req.user.role !== 'admin' && file.owner.toString() !== req.user.id) {
    // 404, not 403 — avoids confirming the fileId exists to a non-owner.
    res.status(404).json({ success: false, message: 'File not found' });
    return null;
  }
  return file;
}

/**
 * GET /api/files/:fileId
 */
exports.getFile = async (req, res) => {
  const file = await findOwnedFile(req, res);
  if (!file) return;
  res.json({ success: true, data: { file } });
};

/**
 * GET /api/files/:fileId/download
 */
exports.downloadFile = async (req, res) => {
  const file = await findOwnedFile(req, res);
  if (!file) return;

  if (file.status !== 'ready') {
    return res.status(409).json({ success: false, message: `File is not ready (status: ${file.status})` });
  }

  const filePath = path.resolve(file.path || path.join(UPLOAD_DIR, file.storedName));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found on disk' });
  }

  audit(req, 'download', file.fileId);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(filePath);
};

/**
 * DELETE /api/files/:fileId
 */
exports.deleteFile = async (req, res) => {
  const file = await findOwnedFile(req, res);
  if (!file) return;

  const filePath = path.resolve(file.path || path.join(UPLOAD_DIR, file.storedName));
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.warn('Could not delete file from disk:', err.message);
  }

  await file.deleteOne();
  audit(req, 'delete', file.fileId);
  res.json({ success: true, message: 'File deleted successfully' });
};

/**
 * GET /api/files/stats/summary
 */
exports.getStats = async (req, res) => {
  const match = req.user.role === 'admin' ? {} : { owner: req.user.id };

  const [totalResult, byCategory, byStatus] = await Promise.all([
    File.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: 1 }, totalSize: { $sum: '$size' } } }]),
    File.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    File.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const stats = {
    totalFiles: totalResult[0]?.total ?? 0,
    totalSize: totalResult[0]?.totalSize ?? 0,
    quotaBytes: MAX_USER_QUOTA_BYTES,
    byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
    byStatus:   Object.fromEntries(byStatus.map(r => [r._id, r.count])),
  };

  res.json({ success: true, data: { stats } });
};
