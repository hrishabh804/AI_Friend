import pino from 'pino';
import { config } from '@/config';

const logger = pino({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: config.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    // Add any context that should be present in all logs
  },
  // Add a hook to include trace_id if available from a context
  mixin() {
    // In a real app, you would get this from a request context, e.g. AsyncLocalStorage
    const traceId = 'placeholder-trace-id';
    return { trace_id: traceId };
  },
});

export { logger };
