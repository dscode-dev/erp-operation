import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [StorageModule],
  controllers: [HealthController, MetricsController],
  providers: [HealthService, MetricsService],
  exports: [MetricsService],
})
export class HealthModule {}
