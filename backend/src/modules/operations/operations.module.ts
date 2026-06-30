import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [StorageModule, AssetLifecycleModule, MaintenancePlanningModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
