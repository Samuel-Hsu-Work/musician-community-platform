// Correlation ID Middleware
// Generates and tracks correlation IDs for request tracing across services

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request to include correlation ID
declare global {
  namespace Express {
    interface Request {
      id?: string; // Correlation ID
    }
  }
}

/**
 * Middleware to generate and attach correlation ID to requests
 * This enables tracing requests across services (frontend, backend, database, external APIs)
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate correlation ID or use existing one from header
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  
  // Attach to request object
  req.id = correlationId;
  
  // Add to response headers for client tracking
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};
