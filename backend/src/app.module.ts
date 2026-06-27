import { MiddlewareConsumer, Module, RequestMethod, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from './infra/logger/logger.module';
import { RequestIdMiddleware } from './infra/security/request-id.middleware';
import { AppConfigModule } from './modules/config/app-config.module';
import { AppConfigService } from './modules/config/app-config.service';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RoleGuard } from './modules/auth/guards/role.guard';
import { PasswordChangeRequiredGuard } from './modules/auth/guards/password-change-required.guard';
import { UsersModule } from './modules/users/users.module';
import { InternalDemoModule } from './modules/internal-demo/internal-demo.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EquipmentsModule } from './modules/equipments/equipments.module';
import { OperationsModule } from './modules/operations/operations.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './shared/interceptors/request-logging.interceptor';
import { ResponseEnvelopeInterceptor } from './shared/interceptors/response-envelope.interceptor';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        {
          ttl: config.rateLimitTtlMs,
          limit: config.rateLimitMax,
        },
      ],
    }),
    LoggerModule,
    DatabaseModule,
    AuthModule,
    OrganizationModule,
    UsersModule,
    InternalDemoModule,
    CustomersModule,
    EquipmentsModule,
    OperationsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PasswordChangeRequiredGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
