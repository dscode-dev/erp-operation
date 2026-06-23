import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';

@Injectable()
export class LifecycleLoggerService implements OnApplicationShutdown {
  constructor(private readonly logger: AppLoggerService) {}

  onApplicationShutdown(signal?: string): void {
    this.logger.info('Application shutdown', {
      event: 'shutdown',
      signal: signal ?? 'application',
    });
  }
}
