import { Module } from '@nestjs/common';
import { MaintenanceChecklistTemplatesController } from './maintenance-checklist-templates.controller';
import { MaintenanceChecklistTemplatesService } from './maintenance-checklist-templates.service';

@Module({
  controllers: [MaintenanceChecklistTemplatesController],
  providers: [MaintenanceChecklistTemplatesService],
  exports: [MaintenanceChecklistTemplatesService],
})
export class MaintenanceChecklistTemplatesModule {}
