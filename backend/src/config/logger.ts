// Better Stack (Logtail) Logger Configuration
// Provides structured JSON logging with centralized log management

import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import winston from 'winston';
import { env } from './env';

let logger: winston.Logger | null = null;
let isInitialized = false;
let logtailEnabled = false;

// Initialize logger with Better Stack (Logtail) integration
const initLogger = (): winston.Logger => {
  if (isInitialized && logger) return logger;

  const token = env.logtailSourceToken;
  let logtail: Logtail | null = null;

  // Validate and initialize Logtail
  if (token && token !== 'test_token_placeholder' && token.trim().length > 0) {
    try {
      console.log('🔧 Initializing Better Stack (Logtail)...');
      
      logtail = new Logtail(token.trim(), {
        batchSize: 10,           // Smaller batch size for faster sending
        batchInterval: 1000,     // Send logs every 1 second
        ignoreExceptions: true,  // Ignore exceptions to prevent crashes
        sendLogsToConsoleOutput: env.nodeEnv === 'development', // Also log to console in dev
      });
      
      logtailEnabled = true;
      console.log('✅ Better Stack (Logtail) initialized successfully');
      
      // Note: Token validation happens on first log send
      // If token is invalid, you'll see "Unauthorized" errors but logs still go to console
      
    } catch (error: any) {
      console.error('❌ Better Stack (Logtail) initialization failed:', error.message);
      console.error('   Falling back to console logging only');
      logtail = null;
      logtailEnabled = false;
    }
  } else {
    console.warn('⚠️ LOGTAIL_SOURCE_TOKEN not configured or invalid');
    console.warn('   Using console logging only');
  }

  // Configure Winston transports
  const transports: winston.transport[] = [
    // Console output - always enabled
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length 
            ? `\n${JSON.stringify(meta, null, 2)}` 
            : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    })
  ];

  // Add Logtail transport if available
  if (logtail) {
    try {
      const logtailTransport = new LogtailTransport(logtail);
      transports.unshift(logtailTransport); // Add to front for priority
      console.log('✅ LogtailTransport added to Winston');
    } catch (error: any) {
      console.error('❌ Failed to add LogtailTransport:', error.message);
      logtailEnabled = false;
    }
  }

  // Create Winston logger with structured JSON format
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json() // Structured JSON logging
    ),
    defaultMeta: { 
      service: 'musictalks-api',
      environment: env.nodeEnv || 'development',
      version: '1.0.0',
      logtail_enabled: logtailEnabled
    },
    transports
  });

  // Log initialization status
  logger.info('Logger initialized', {
    type: 'system',
    logtail_enabled: logtailEnabled,
    token_configured: !!token,
    environment: env.nodeEnv || 'development'
  });

  isInitialized = true;
  return logger;
};

// Get logger instance (initializes if needed)
const getLogger = (): winston.Logger => {
  if (!logger) initLogger();
  return logger!;
};

// Check if Logtail is enabled
export const isLogtailEnabled = (): boolean => logtailEnabled;

// ============================================
// Specialized logging functions
// ============================================

// Log API request with performance metrics
export const logApiRequest = (
  req: any,
  duration: number,
  statusCode: number,
  correlationId?: string
) => {
  getLogger().info('API Request', {
    type: 'api_request',
    method: req.method,
    path: req.path,
    duration_ms: duration,
    status_code: statusCode,
    user_id: req.user?.id,
    user_agent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
    query: req.query,
    correlation_id: correlationId || req.id,
  });
};

// Log database operation with latency tracking
export const logDatabaseOperation = (
  operation: string,
  model: string,
  duration: number,
  success: boolean,
  correlationId?: string,
  error: Error | null = null
) => {
  const logLevel = success ? 'info' : 'error';
  getLogger()[logLevel]('Database Operation', {
    type: 'database',
    operation,
    model,
    duration_ms: duration,
    success,
    correlation_id: correlationId,
    error: error?.message,
    stack: error?.stack,
  });
};

// Log external API call (e.g., OpenAI)
export const logExternalApiCall = (
  service: string,
  endpoint: string,
  duration: number,
  statusCode: number,
  correlationId?: string,
  error: Error | null = null
) => {
  const logLevel = statusCode >= 200 && statusCode < 300 ? 'info' : 'error';
  getLogger()[logLevel]('External API Call', {
    type: 'external_api',
    service,
    endpoint,
    duration_ms: duration,
    status_code: statusCode,
    success: !error,
    correlation_id: correlationId,
    error: error?.message,
  });
};

// Log security events
export const logSecurityEvent = (
  eventType: string,
  details: Record<string, any>,
  correlationId?: string
) => {
  getLogger().warn('Security Event', {
    type: 'security',
    event_type: eventType,
    timestamp: new Date().toISOString(),
    correlation_id: correlationId,
    ...details,
  });
};

// Test logger functionality
export const testLogger = async () => {
  const logger = getLogger();
  
  console.log('\n🧪 Testing logger system...\n');
  
  logger.info('Test log - INFO level', { 
    test_type: 'info',
    timestamp: new Date().toISOString() 
  });
  
  logger.warn('Test log - WARN level', { 
    test_type: 'warning',
    timestamp: new Date().toISOString() 
  });
  
  logger.error('Test log - ERROR level', { 
    test_type: 'error',
    timestamp: new Date().toISOString(),
    test_error: 'This is a test error message'
  });
  
  console.log('\n✅ Test logs sent');
  console.log(`📊 Logtail status: ${logtailEnabled ? '✅ Enabled' : '⚠️ Disabled (console only)'}\n`);
  
  // Wait for logs to be sent
  await new Promise(resolve => setTimeout(resolve, 2000));
};

// Default export
export default { 
  get: getLogger,
  test: testLogger,
  isLogtailEnabled
};
