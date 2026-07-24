import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import {
  ListMaintenanceRemindersQueryDto,
  PmocUpcomingQueryDto,
  UpdateMaintenanceReminderDto,
} from './dto/maintenance-reminder.dto';
import { MaintenanceRemindersService } from './maintenance-reminders.service';

@Controller('maintenance-reminders')
@Roles(Role.OWNER, Role.MANAGER)
export class MaintenanceRemindersController {
  constructor(private readonly reminders: MaintenanceRemindersService) {}

  @Get()
  list(
    @Query() query: ListMaintenanceRemindersQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.reminders.list(query, actor);
  }

  @Get('stats')
  stats(@CurrentUser() actor: AuthenticatedUser): Promise<unknown> {
    return this.reminders.stats(actor);
  }

  @Get('pmoc-upcoming')
  pmocUpcoming(
    @Query() query: PmocUpcomingQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.reminders.pmocUpcoming(query.customerId, actor);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMaintenanceReminderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.reminders.update(id, dto, actor);
  }
}
