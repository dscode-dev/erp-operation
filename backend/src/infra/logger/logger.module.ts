import { Global, Module } from '@nestjs/common';
import { AppConfigModule } from '../../modules/config/app-config.module';
import { AppLoggerService } from './app-logger.service';
import { LifecycleLoggerService } from './lifecycle-logger.service';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [AppLoggerService, LifecycleLoggerService],
  exports: [AppLoggerService],
})
export class LoggerModule {}
