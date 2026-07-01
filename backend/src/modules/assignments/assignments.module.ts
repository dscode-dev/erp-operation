import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [AssetLifecycleModule, MaintenancePlanningModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
