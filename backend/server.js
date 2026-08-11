require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const { loadSecretsFromVault } = require('./config/vault');
const connectDB = require('./config/database');
const fileRoutes = require('./routes/files');
const authRoutes = require('./routes/auth');

async function startServer() {
  // 1. Fetch secrets from Vault into process.env before initialization
  await loadSecretsFromVault();

  // 2. Validate essential secrets pulled from Vault
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET is missing or too short (need >= 32 chars). Set it via Vault / Secret.');
    process.exit(1);
  }

  // 3. Connect to MongoDB
  await connectDB();

  const app = express();
  app.set('trust proxy', 1);
  const PORT = process.env.PORT || 5000;

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, message: 'Upload limit reached. Please wait a minute.' },
  });

  app.use(limiter);

  // Dynamic CORS configuration (reads ALLOWED_ORIGINS injected by Vault)
  if (!process.env.ALLOWED_ORIGINS) {
    console.warn('⚠️  ALLOWED_ORIGINS is not set — defaulting to no cross-origin access allowed.');
  }
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
  );
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Logging & Body Parsing
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/files', uploadLimiter, fileRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV,
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'File too large. Maximum size is 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Maximum 10 files per upload.' });
    }
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  app.listen(PORT, () => {
    console.log(`🚀 FileForge API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log(`   MongoDB URI status: ${process.env.MONGODB_URI ? 'Loaded' : 'Missing'}`);
  });
}

startServer();
