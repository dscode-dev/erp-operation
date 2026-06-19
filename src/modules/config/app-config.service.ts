import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from './configuration';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  get appName(): string {
    return this.configService.get('APP_NAME', { infer: true });
  }

  get port(): number {
    return this.configService.get('APP_PORT', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.configService.get('CORS_ORIGINS', { infer: true });
  }

  get rateLimitTtlMs(): number {
    return this.configService.get('RATE_LIMIT_TTL_MS', { infer: true });
  }

  get rateLimitMax(): number {
    return this.configService.get('RATE_LIMIT_MAX', { infer: true });
  }

  get logLevel(): EnvironmentVariables['LOG_LEVEL'] {
    return this.configService.get('LOG_LEVEL', { infer: true });
  }
}
