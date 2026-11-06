import { createApp } from './app';
import logger from './config/logger';

const PORT = process.env.PORT || 3001;

const { app, sentryEnabled } = createApp();

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
