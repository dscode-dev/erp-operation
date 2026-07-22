import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { OperationAccessModule } from '../operation-access/operation-access.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { OperatorExecutionsController } from './operator-executions.controller';
import { OperatorExecutionsService } from './operator-executions.service';

@Module({
  imports: [StorageModule, AssetLifecycleModule, MaintenancePlanningModule, AssignmentsModule, OperationAccessModule],
  controllers: [OperationsController, OperatorExecutionsController],
  providers: [OperationsService, OperatorExecutionsService],
  exports: [OperationsService],
})
export class OperationsModule {}
