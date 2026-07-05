# Observability Setup

This document describes the observability infrastructure for MusicTalks backend, implementing end-to-end monitoring with Sentry and Better Stack.

## Overview

The observability stack provides:
- **Error Tracking**: Sentry for capturing and tracking errors
- **Structured Logging**: Better Stack (Logtail) with Winston for centralized JSON logging
- **Request Tracing**: Correlation IDs for tracking requests across services
- **Performance Monitoring**: API and database latency tracking with alerting thresholds

## Components

### 1. Sentry (Error Tracking)

**Location**: `src/config/sentry.ts`

**Features**:
- Error capture with context (user, tags, breadcrumbs)
- Performance monitoring (traces)
- Sensitive data filtering (passwords, etc.)
- Environment-aware configuration (dev vs prod)

**Usage**:
```typescript
import { captureError, captureMessage, addBreadcrumb } from '../config/sentry';

// Capture error with context
captureError(error, {
  user: { id: user.id, username: user.username },
  tags: { endpoint: '/api/forum/topics' },
  correlationId: req.id,
});

// Capture message
captureMessage('Topic generated successfully', 'info', {
  correlationId: req.id,
});
```

### 2. Better Stack / Logtail (Structured Logging)

**Location**: `src/config/logger.ts`

**Features**:
- Structured JSON logging
- Centralized log management via Better Stack
- Console fallback if Logtail not configured
- Specialized logging functions for API, DB, external APIs

**Usage**:
```typescript
import logger from '../config/logger';
import { logApiRequest, logDatabaseOperation, logExternalApiCall } from '../config/logger';

// General logging
logger.get().info('Operation completed', { 
  type: 'operation',
  correlation_id: req.id,
});

// Specialized logging
logApiRequest(req, duration, statusCode, correlationId);
logDatabaseOperation('findMany', 'Topic', duration, true, correlationId);
logExternalApiCall('OpenAI', '/chat/completions', duration, 200, correlationId);
```

### 3. Correlation IDs

**Location**: `src/middleware/correlationId.middleware.ts`

**Features**:
- Unique ID per request for tracing
- Passed in `X-Correlation-ID` header
- Available in `req.id` throughout request lifecycle

**Usage**:
```typescript
// Correlation ID is automatically attached to req.id
const correlationId = req.id;

// Include in logs
logger.get().info('Processing request', { correlation_id: correlationId });

// Include in Sentry
captureError(error, { correlationId });
```

### 4. Performance Tracking

**Location**: `src/middleware/performance.middleware.ts`

**Features**:
- Automatic API latency tracking
- Performance threshold alerting (>1000ms)
- Sentry breadcrumbs for performance events

**Alerting**: 
- Threshold: 1000ms
- Logged as warning when exceeded
- Tracked in Better Stack for analysis

### 5. Error Handling

**Location**: `src/middleware/errorHandler.middleware.ts`

**Features**:
- Centralized error handling
- Sentry integration with context
- Structured error responses
- Correlation ID in error responses

## Environment Variables

```env
# Sentry
SENTRY_DSN=your-sentry-dsn-here
SENTRY_ENVIRONMENT=development|production

# Better Stack (Logtail)
LOGTAIL_SOURCE_TOKEN=your-logtail-source-token-here
```

## Performance Monitoring

### API Latency Tracking
- Automatic tracking for all API requests
- Logged with: method, path, duration, status code
- Alerting when latency > 1000ms

### Database Query Tracking
Use the `trackDatabaseOperation` utility:
```typescript
import { trackDatabaseOperation } from '../utils/performance';

const topics = await trackDatabaseOperation(
  'findMany',
  'Topic',
  () => prisma.topic.findMany({ ... }),
  req.id
);
```

### External API Tracking
Use the `trackExternalApiCall` utility:
```typescript
import { trackExternalApiCall } from '../utils/performance';

const result = await trackExternalApiCall(
  'OpenAI',
  '/chat/completions',
  () => aiService.generateResponse(prompt),
  req.id
);
```

## Troubleshooting Process

Following the detect → diagnose → resolve → prevent cycle:

### Detection
- **Better Stack Alerts**: Configure alerts for API latency > 1000ms
- **Sentry Alerts**: Track error spikes and performance degradation
- **Log Patterns**: Monitor structured logs for anomalies

### Investigation
- **Correlation IDs**: Trace requests across services using correlation IDs
- **Structured Logs**: Filter logs by correlation ID to see full request flow
- **Sentry Breadcrumbs**: Review breadcrumbs to understand error context

### Root Cause Analysis
- **Performance Logs**: Identify slow operations (API, database queries)
- **Error Patterns**: Group errors by type, endpoint, user
- **Database Queries**: Track slow queries and missing indexes

### Resolution
- **Infrastructure Changes**: Measure impact (e.g., P95 latency before/after)
- **Code Fixes**: Deploy fixes and monitor improvement
- **Documentation**: Document resolution steps

### Prevention
- **Weekly Analysis**: Review logs and errors weekly
- **Pattern Recognition**: Document recurring issues
- **Optimization**: Proactively optimize based on metrics

## Alerting Configuration

### Better Stack Alerts
Configure alerts in Better Stack dashboard:
- **API Latency > 1000ms**: Monitor performance degradation
- **Error Rate Spike**: Alert on increased error rates
- **Database Query Time**: Alert on slow database operations

### Sentry Alerts
Configure alerts in Sentry dashboard:
- **Error Spike**: Alert when errors exceed threshold
- **Performance Regression**: Alert on latency increases
- **New Error Types**: Alert on new error patterns

## Example: Complete Request Flow

1. **Request arrives** → Correlation ID generated
2. **Performance middleware** → Starts timing
3. **Controller execution**:
   - Logs API request start
   - Tracks database operations
   - Tracks external API calls
4. **Response sent** → Performance logged
5. **If error** → Captured in Sentry with full context

All logs include:
- Correlation ID for tracing
- Performance metrics
- Context (user, endpoint, etc.)
- Structured JSON format

## Best Practices

1. **Always include correlation IDs** in logs and errors
2. **Use structured logging** instead of console.log
3. **Track performance** for database and external API calls
4. **Add context** to errors (user, tags, breadcrumbs)
5. **Monitor thresholds** and set up alerts
6. **Review logs weekly** for patterns and improvements
