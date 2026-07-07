import { LogEntry } from '../types';

/**
 * Legacy Logger class for backward compatibility
 * @deprecated Logger has been removed from SDK. Use error handling instead.
 * The SDK now throws structured errors that you can catch and log as needed.
 * 
 * @example
 * ```typescript
 * try {
 *   const view = yeriaApp.createFormView('id', 'title');
 * } catch (error) {
 *   if (error instanceof ViewValidationError) {
 *     myLogger.error('Validation failed', error.toJSON());
 *   }
 * }
 * ```
 */
export class Logger {
    private static instance: Logger;
    private logLevel: LogEntry['level'] = 'info';
    private handlers: Array<(entry: LogEntry) => void> = [];

    private constructor() { }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLogLevel(level: LogEntry['level']): void {
        this.logLevel = level;
    }

    addHandler(handler: (entry: LogEntry) => void): void {
        this.handlers.push(handler);
    }

    private shouldLog(level: LogEntry['level']): boolean {
        const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private createEntry(
        level: LogEntry['level'],
        message: string,
        context?: Record<string, unknown>
    ): LogEntry {
        return {
            timestamp: new Date(),
            level,
            message,
            context,
            stack: level === 'error' ? new Error().stack : undefined,
        };
    }

    private emit(entry: LogEntry): void {
        if (!this.shouldLog(entry.level)) return;

        // Default handler (console)
        const defaultHandler = (entry: LogEntry) => {
            const prefix = `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}]`;
            const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

            switch (entry.level) {
                case 'debug':
                    console.debug(`${prefix} ${entry.message}${contextStr}`);
                    break;
                case 'info':
                    console.info(`${prefix} ${entry.message}${contextStr}`);
                    break;
                case 'warn':
                    console.warn(`${prefix} ${entry.message}${contextStr}`);
                    break;
                case 'error':
                    console.error(`${prefix} ${entry.message}${contextStr}`, entry.stack);
                    break;
            }
        };

        // Execute all handlers
        [defaultHandler, ...this.handlers].forEach(handler => {
            try {
                handler(entry);
            } catch (error) {
                console.error('Logger handler error:', error);
            }
        });
    }

    debug(message: string, context?: Record<string, unknown>): void {
        this.emit(this.createEntry('debug', message, context));
    }

    info(message: string, context?: Record<string, unknown>): void {
        this.emit(this.createEntry('info', message, context));
    }

    warn(message: string, context?: Record<string, unknown>): void {
        this.emit(this.createEntry('warn', message, context));
    }

    error(message: string, context?: Record<string, unknown>): void {
        this.emit(this.createEntry('error', message, context));
    }

    // Static methods for convenience
    static debug(message: string, context?: Record<string, unknown>): void {
        Logger.getInstance().debug(message, context);
    }

    static info(message: string, context?: Record<string, unknown>): void {
        Logger.getInstance().info(message, context);
    }

    static warn(message: string, context?: Record<string, unknown>): void {
        Logger.getInstance().warn(message, context);
    }

    static error(message: string, context?: Record<string, unknown>): void {
        Logger.getInstance().error(message, context);
    }
} 