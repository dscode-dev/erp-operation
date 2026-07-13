import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppLoggerService } from './infra/logger/app-logger.service';
import { applyRequestId } from './infra/security/request-id.middleware';
import { AppConfigService } from './modules/config/app-config.service';
import { API_PREFIX, API_VERSION } from './shared/constants/api.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const config = app.get(AppConfigService);
  const logger = app.get(AppLoggerService);

  app.useLogger(logger);
  app.enableShutdownHooks();
  app.use(applyRequestId);
  const operationsPath = `/${API_PREFIX}/v${API_VERSION}/operations`;
  app.use(
    operationsPath,
    json({ limit: config.operationJsonBodyLimitBytes }),
    urlencoded({ extended: true, limit: config.operationJsonBodyLimitBytes }),
  );
  app.use(
    json({ limit: config.httpJsonBodyLimitBytes }),
    urlencoded({ extended: true, limit: config.httpJsonBodyLimitBytes }),
  );
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 600,
  });
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );

  await app.listen(config.port, '0.0.0.0');
  logger.info('Application started', {
    event: 'startup',
    port: config.port,
    basePath: `/${API_PREFIX}/v${API_VERSION}`,
    nodeEnv: process.env.NODE_ENV ?? 'development',
  });
}

bootstrap().catch((error: unknown) => {
  const failure = {
    timestamp: new Date().toISOString(),
    level: 'error',
    event: 'startup_failure',
    message: error instanceof Error ? error.message : 'Unknown startup error',
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  };
  process.stderr.write(`${JSON.stringify(failure)}\n`);
  process.exitCode = 1;
});
