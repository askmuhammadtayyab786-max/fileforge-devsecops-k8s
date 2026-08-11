const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

/**
 * Fixes: "Weak file-type filtering (blacklist, not allowlist)" (Tampering)
 *
 * Only explicitly-approved categories are accepted. This is a first-pass
 * filter on the client-declared MIME type; middleware/scan.js re-verifies
 * the actual file content (magic bytes) after upload before marking a
 * file "ready" for download.
 */
const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-tar',
  'application/gzip',
]);

// Never allow these regardless of declared MIME type (executables, scripts,
// markup that can carry active content such as SVG/HTML).
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.sh', '.cmd', '.com', '.ps1', '.vbs', '.msi', '.jar',
  '.php', '.phtml', '.js', '.mjs', '.html', '.htm', '.svg', '.dll', '.scr',
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new Error(`File type ${ext} is not allowed`), false);
  }

  const mime = file.mimetype || '';
  const allowed =
    ALLOWED_MIME_PREFIXES.some(p => mime.startsWith(p)) || ALLOWED_MIME_EXACT.has(mime);

  if (!allowed) {
    return cb(new Error(`MIME type ${mime} is not on the allowlist`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number.parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    files: 10,
  },
});

module.exports = upload;