import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { OperationAccessModule } from '../operation-access/operation-access.module';
import { MaintenancePlanningController } from './maintenance-planning.controller';
import { MaintenancePlanningService } from './maintenance-planning.service';
import { RecurringEngine } from './recurring-engine.service';

@Module({
  imports: [AssetLifecycleModule, OperationAccessModule],
  controllers: [MaintenancePlanningController],
  providers: [MaintenancePlanningService, RecurringEngine],
  exports: [MaintenancePlanningService, RecurringEngine],
})
export class MaintenancePlanningModule {}
