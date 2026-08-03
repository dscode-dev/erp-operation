import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { OperationsModule } from '../operations/operations.module';
import { MaintenancePlanningModule } from '../maintenance-planning/maintenance-planning.module';
import { RvtPlanningController } from './rvt-planning.controller';
import { RvtPlanningService } from './rvt-planning.service';

@Module({
  imports: [AssignmentsModule, OperationsModule, MaintenancePlanningModule],
  controllers: [RvtPlanningController],
  providers: [RvtPlanningService],
  exports: [RvtPlanningService],
})
export class RvtPlanningModule {}
