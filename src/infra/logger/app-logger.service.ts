import { Injectable, type LoggerService } from '@nestjs/common';
import { AppConfigService } from '../../modules/config/app-config.service';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

@Injectable()
export class AppLoggerService implements LoggerService {
  constructor(private readonly config: AppConfigService) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('info', String(message), this.toContext(optionalParams));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', String(message), this.toContext(optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', String(message), this.toContext(optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', String(message), this.toContext(optionalParams));
  }

  info(message: string, context: LogContext = {}): void {
    this.write('info', message, context);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', String(message), this.toContext(optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', String(message), this.toContext(optionalParams));
  }

  private write(level: LogLevel, message: string, context: LogContext): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.config.logLevel]) {
      return;
    }

    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: this.config.appName,
      message,
      ...context,
    });

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${entry}\n`);
  }

  private toContext(values: unknown[]): LogContext {
    if (values.length === 0) {
      return {};
    }

    if (
      values.length === 1 &&
      typeof values[0] === 'object' &&
      values[0] !== null &&
      !Array.isArray(values[0])
    ) {
      return values[0] as LogContext;
    }

    return { context: values };
  }
}
