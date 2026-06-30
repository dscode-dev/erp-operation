import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { PmocComplianceController } from './pmoc-compliance.controller';
import { PmocComplianceService } from './pmoc-compliance.service';

@Module({
  imports: [AssetLifecycleModule, DocumentEngineModule, MaintenancePlanningModule],
  controllers: [PmocComplianceController],
  providers: [PmocComplianceService],
  exports: [PmocComplianceService],
})
export class PmocComplianceModule {}
