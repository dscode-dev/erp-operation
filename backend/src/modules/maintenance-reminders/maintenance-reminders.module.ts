import { Module } from '@nestjs/common';
import { MaintenanceRemindersController } from './maintenance-reminders.controller';
import { MaintenanceRemindersService } from './maintenance-reminders.service';

@Module({
  controllers: [MaintenanceRemindersController],
  providers: [MaintenanceRemindersService],
  exports: [MaintenanceRemindersService],
})
export class MaintenanceRemindersModule {}
