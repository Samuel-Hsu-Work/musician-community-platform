// Error Handler Middleware
// Handles errors with Sentry integration and structured logging

import { Request, Response, NextFunction } from 'express';
import { captureError } from '../config/sentry';
import logger from '../config/logger';
import { env } from '../config/env';

/**
 * Global error handler middleware
 * Integrates with Sentry for error tracking and provides structured error responses
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.id;

  // Log error with structured logging
  logger.get().error('Error occurred', {
    type: 'error',
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    correlation_id: correlationId,
    user_id: (req as any).user?.id,
  });

  // Capture error in Sentry with context
  captureError(err, {
    tags: {
      method: req.method,
      path: req.path,
      status_code: err.statusCode?.toString() || '500',
    },
    extra: {
      query: req.query,
      body: req.body,
      params: req.params,
    },
    correlationId,
    user: (req as any).user ? {
      id: (req as any).user.id,
      username: (req as any).user.username,
      email: (req as any).user.email,
    } : undefined,
    breadcrumb: {
      category: 'error',
      message: `Error in ${req.method} ${req.path}`,
      level: 'error',
      data: {
        error: err.message,
      },
    },
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
    ...(correlationId && { correlationId }),
  });
};
