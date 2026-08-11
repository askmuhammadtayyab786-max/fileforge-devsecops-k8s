const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const {
  uploadFiles,
  getFiles,
  getFile,
  downloadFile,
  deleteFile,
  getStats,
} = require('../controllers/fileController');

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Fix: "No authentication/authorization on any API endpoint" (Elevation of Privilege)
// Every route below now requires a valid JWT; fileController then further
// restricts reads/writes to the requesting user's own files.
router.use(authenticate);

router.get('/stats/summary', asyncHandler(getStats));
router.post('/upload', upload.array('files', 10), asyncHandler(uploadFiles));
router.get('/', asyncHandler(getFiles));
router.get('/:fileId', asyncHandler(getFile));
router.get('/:fileId/download', asyncHandler(downloadFile));
router.delete('/:fileId', asyncHandler(deleteFile));

module.exports = router;
