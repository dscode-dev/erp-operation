import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { OperationAccessModule } from '../operation-access/operation-access.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [StorageModule, AssetLifecycleModule, MaintenancePlanningModule, AssignmentsModule, OperationAccessModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
