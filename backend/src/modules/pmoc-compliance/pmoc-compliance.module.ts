import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperationsModule } from '../operations/operations.module';
import { PmocComplianceController } from './pmoc-compliance.controller';
import { PmocComplianceService } from './pmoc-compliance.service';
import { PmocExecutionRequestsService } from './pmoc-execution-requests.service';
import { PmocSchedulerService } from './pmoc-scheduler.service';

@Module({
  imports: [
    AssetLifecycleModule,
    DocumentEngineModule,
    MaintenancePlanningModule,
    NotificationsModule,
    OperationsModule,
  ],
  controllers: [PmocComplianceController],
  providers: [PmocComplianceService, PmocExecutionRequestsService, PmocSchedulerService],
  exports: [PmocComplianceService, PmocExecutionRequestsService, PmocSchedulerService],
})
export class PmocComplianceModule {}
