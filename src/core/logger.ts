/**
 * LAKNES Core Logger
 * Structured logging utility supporting levels, context tags, and metadata.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private formatMessage(level: LogLevel, tag: string, message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      level: level.toUpperCase(),
      context: tag,
      message,
      ...(meta ? { meta } : {}),
    };
  }

  debug(tag: string, message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify(this.formatMessage('debug', tag, message, meta)));
    }
  }

  info(tag: string, message: string, meta?: unknown) {
    console.info(JSON.stringify(this.formatMessage('info', tag, message, meta)));
  }

  warn(tag: string, message: string, meta?: unknown) {
    console.warn(JSON.stringify(this.formatMessage('warn', tag, message, meta)));
  }

  error(tag: string, message: string, meta?: unknown) {
    console.error(JSON.stringify(this.formatMessage('error', tag, message, meta)));
  }
}

export const logger = new Logger();
