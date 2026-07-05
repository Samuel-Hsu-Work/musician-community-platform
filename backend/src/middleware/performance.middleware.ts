// Performance Tracking Middleware
// Tracks API latency and logs performance metrics for alerting

import { Request, Response, NextFunction } from 'express';
import { logApiRequest } from '../config/logger';
import { addBreadcrumb } from '../config/sentry';

// Performance threshold for alerting (ms)
const PERFORMANCE_THRESHOLD_MS = 1000; // Alert if API latency > 1000ms

/**
 * Middleware to track API request performance and log latency
 * Enables performance monitoring and alerting on thresholds
 */
export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  const correlationId = req.id;

  // Override res.end to capture response time
  const originalEnd = res.end.bind(res);
  (res as any).end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log API request with performance metrics
    logApiRequest(req, duration, statusCode, correlationId);

    // Add Sentry breadcrumb for performance tracking
    addBreadcrumb({
      category: 'performance',
      message: `${req.method} ${req.path} - ${duration}ms`,
      level: duration > PERFORMANCE_THRESHOLD_MS ? 'warning' : 'info',
      data: {
        method: req.method,
        path: req.path,
        duration_ms: duration,
        status_code: statusCode,
        threshold_exceeded: duration > PERFORMANCE_THRESHOLD_MS,
      },
    });

    // Warning if performance threshold exceeded
    if (duration > PERFORMANCE_THRESHOLD_MS) {
      console.warn(
        `⚠️ Performance threshold exceeded: ${req.method} ${req.path} took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`
      );
    }

    // Call original end method
    if (typeof chunk === 'function') {
      return originalEnd(chunk);
    } else if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding);
    } else {
      return originalEnd(chunk, encoding, cb);
    }
  };

  next();
};
