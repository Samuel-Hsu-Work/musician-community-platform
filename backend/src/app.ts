import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize observability FIRST (before other imports)
import { initSentry } from './config/sentry';
import logger from './config/logger';
import { correlationIdMiddleware } from './middleware/correlationId.middleware';
import { performanceMiddleware } from './middleware/performance.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import apiRoutes from './routes';

export interface CreatedApp {
  app: express.Express;
  sentryEnabled: boolean;
}

/** Builds the Express app without binding a port, so tests can drive it in-process. */
export function createApp(): CreatedApp {
  const app = express();

  // Trust the first hop reverse proxy (Render) so req.ip / rate limiting see the
  // real client IP instead of the proxy's.
  app.set('trust proxy', 1);

  // Initialize Sentry (must be before other middleware)
  const sentryEnabled = initSentry(app);

  // Initialize logger
  logger.get();

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

  return { app, sentryEnabled };
}
