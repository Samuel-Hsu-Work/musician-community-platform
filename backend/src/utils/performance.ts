// Performance Tracking Utilities
// Helper functions for tracking database query performance

import { logDatabaseOperation, logExternalApiCall } from '../config/logger';

/**
 * Track database operation performance
 * Wraps a database operation and logs its duration
 */
export const trackDatabaseOperation = async <T>(
  operation: string,
  model: string,
  operationFn: () => Promise<T>,
  correlationId?: string
): Promise<T> => {
  const startTime = Date.now();
  let success = true;
  let error: Error | null = null;

  try {
    const result = await operationFn();
    return result;
  } catch (err: any) {
    success = false;
    error = err;
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    logDatabaseOperation(operation, model, duration, success, correlationId, error);
  }
};

/**
 * Track external API call performance
 */
export const trackExternalApiCall = async <T>(
  service: string,
  endpoint: string,
  apiCallFn: () => Promise<T>,
  correlationId?: string
): Promise<T> => {
  const startTime = Date.now();
  let statusCode = 200;
  let error: Error | null = null;

  try {
    const result = await apiCallFn();
    return result;
  } catch (err: any) {
    statusCode = err.statusCode || err.status || 500;
    error = err;
    throw err;
  } finally {
    const duration = Date.now() - startTime;
    logExternalApiCall(service, endpoint, duration, statusCode, correlationId, error);
  }
};
