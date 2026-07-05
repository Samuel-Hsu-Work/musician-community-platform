// Enhanced Sentry Configuration
// Provides error tracking with filtering, context, and performance monitoring

import * as Sentry from '@sentry/node';
import { env } from './env';

export const initSentry = (app?: any) => {
  const dsn = env.sentryDsn;
  
  // Check if Sentry DSN is configured and valid
  if (!dsn || dsn.includes('your-dsn-here') || dsn.includes('xxx')) {
    console.warn('⚠️ SENTRY_DSN not configured or invalid, Sentry monitoring disabled');
    return false;
  }

  try {
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.sentryEnvironment,
      tracesSampleRate: env.nodeEnv === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Filter sensitive data from requests
      beforeSend(event, hint) {
        // Filter passwords from request data
        if (event.request?.data) {
          if (event.request.data.password) event.request.data.password = '[Filtered]';
          if (event.request.data.confirmPassword) event.request.data.confirmPassword = '[Filtered]';
          if (event.request.data.oldPassword) event.request.data.oldPassword = '[Filtered]';
          if (event.request.data.newPassword) event.request.data.newPassword = '[Filtered]';
        }
        
        // Debug logging in development
        if (env.nodeEnv === 'development') {
          console.error('🔍 Sentry captured error:', hint.originalException || hint.syntheticException);
        }
        
        return event;
      },
      
      // Ignore common non-critical errors
      ignoreErrors: [
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        'ResizeObserver loop limit exceeded',
      ],
    });
    
    console.log('✅ Sentry initialized successfully');
    console.log(`📊 Environment: ${env.nodeEnv}`);
    console.log(`📈 Trace sample rate: ${env.nodeEnv === 'production' ? '10%' : '100%'}`);
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Sentry initialization failed:', error.message);
    return false;
  }
};

// Capture error with context
export const captureError = (error: Error, context: {
  user?: { id?: string; username?: string; email?: string };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  breadcrumb?: { category?: string; message: string; level?: string; data?: any };
  correlationId?: string;
} = {}) => {
  console.error('❌ Captured exception:', error);
  
  if (!env.sentryDsn || env.sentryDsn.includes('your-dsn-here') || env.sentryDsn.includes('xxx')) {
    return;
  }
  
  Sentry.withScope((scope) => {
    // Set user context
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        username: context.user.username,
        email: context.user.email,
      });
    }
    
    // Set tags for filtering
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    // Set correlation ID for tracing
    if (context.correlationId) {
      scope.setTag('correlation_id', context.correlationId);
    }
    
    // Set extra context
    if (context.extra) {
      scope.setContext('additional_info', context.extra);
    }
    
    // Add breadcrumb
    if (context.breadcrumb) {
      scope.addBreadcrumb({
        category: context.breadcrumb.category || 'error',
        message: context.breadcrumb.message,
        level: (context.breadcrumb.level as any) || 'error',
        data: context.breadcrumb.data,
      });
    }
    
    Sentry.captureException(error);
  });
};

// Capture message with context
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context: {
    user?: { id?: string; username?: string; email?: string };
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    correlationId?: string;
  } = {}
) => {
  console.log(`📝 [${level.toUpperCase()}] ${message}`);
  
  if (!env.sentryDsn || env.sentryDsn.includes('your-dsn-here') || env.sentryDsn.includes('xxx')) {
    return;
  }
  
  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        username: context.user.username,
        email: context.user.email,
      });
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.correlationId) {
      scope.setTag('correlation_id', context.correlationId);
    }
    
    if (context.extra) {
      scope.setContext('additional_info', context.extra);
    }
    
    Sentry.captureMessage(message, level);
  });
};

// Set user context
export const setUser = (user: { id?: string; username?: string; email?: string }) => {
  if (!env.sentryDsn || env.sentryDsn.includes('your-dsn-here') || env.sentryDsn.includes('xxx') || !user) {
    return;
  }
  
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

// Clear user context
export const clearUser = () => {
  if (!env.sentryDsn || env.sentryDsn.includes('your-dsn-here') || env.sentryDsn.includes('xxx')) {
    return;
  }
  
  Sentry.setUser(null);
};

// Add breadcrumb
export const addBreadcrumb = (breadcrumb: {
  category?: string;
  message: string;
  level?: string;
  data?: any;
}) => {
  if (!env.sentryDsn || env.sentryDsn.includes('your-dsn-here') || env.sentryDsn.includes('xxx')) {
    return;
  }
  
  Sentry.addBreadcrumb({
    category: breadcrumb.category || 'action',
    message: breadcrumb.message,
    level: (breadcrumb.level as any) || 'info',
    data: breadcrumb.data,
  });
};

export { Sentry };
