import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { ListNotificationsQueryDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.notifications.list(query, actor);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() actor: AuthenticatedUser): Promise<{ count: number }> {
    return this.notifications.unreadCount(actor);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.notifications.markRead(id, actor);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() actor: AuthenticatedUser): Promise<{ updated: number }> {
    return this.notifications.markAllRead(actor);
  }
}
