import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize observability FIRST (before other imports)
import { initSentry } from './config/sentry';
import logger from './config/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first hop reverse proxy (Render) so req.ip / rate limiting see the
// real client IP instead of the proxy's.
app.set('trust proxy', 1);

// Initialize Sentry (must be before other middleware)
const sentryEnabled = initSentry(app);

// Initialize logger
logger.get(); // Initialize logger

// Middleware
// CORS configuration - allow production and preview URLs from Vercel
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Remove trailing slash for comparison
    const cleanOrigin = origin.replace(/\/$/, '');
    const cleanAllowed = corsOrigin.replace(/\/$/, '');
    
    // Allow exact match
    if (cleanOrigin === cleanAllowed) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview deployments (*.vercel.app) in production
    if (process.env.NODE_ENV === 'production' && /^https:\/\/.*\.vercel\.app$/.test(cleanOrigin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Observability middleware (must be before routes)
import { correlationIdMiddleware } from './middleware/correlationId.middleware';
import { performanceMiddleware } from './middleware/performance.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';

app.use(correlationIdMiddleware); // Generate correlation IDs
app.use(performanceMiddleware); // Track API latency

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MusicTalks API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      forum: '/api/forum',
      ai: '/api/ai',
    },
    correlationId: req.id,
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MusicTalks API is running',
    correlationId: req.id,
  });
});

// API routes
import apiRoutes from './routes';
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  logger.get().warn('Route not found', {
    type: '404',
    method: req.method,
    path: req.originalUrl,
    correlation_id: req.id,
  });

  if (sentryEnabled) {
    const { captureMessage } = require('./config/sentry');
    captureMessage(`404 Not Found: ${req.method} ${req.originalUrl}`, 'warning', {
      correlationId: req.id,
      tags: { method: req.method, path: req.originalUrl },
    });
  }

  res.status(404).json({ 
    error: 'Route not found',
    correlationId: req.id,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔍 Sentry: ${sentryEnabled ? '✅ Enabled' : '⚠️ Not configured'}`);
  console.log(`📊 Better Stack: ${process.env.LOGTAIL_SOURCE_TOKEN ? '✅ Enabled' : '⚠️ Not configured'}`);
  
  logger.get().info('Server started', {
    type: 'system',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    sentry_enabled: sentryEnabled,
    logtail_enabled: logger.isLogtailEnabled(),
  });
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed');
    if (sentryEnabled) {
      const { Sentry } = require('@sentry/node');
      Sentry.close(2000).then(() => {
        console.log('✅ Sentry closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // Force exit if connections keep the process alive (e.g. tsx watch restart)
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (sentryEnabled) {
    const { Sentry } = require('@sentry/node');
    Sentry.captureException(reason);
    Sentry.close(2000).then(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  if (sentryEnabled) {
    const { Sentry } = require('@sentry/node');
    Sentry.captureException(error);
    Sentry.close(2000).then(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
