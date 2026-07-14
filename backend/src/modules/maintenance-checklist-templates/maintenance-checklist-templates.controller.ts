import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateMaintenanceChecklistTemplateDto,
  ListMaintenanceChecklistTemplatesQueryDto,
  UpdateMaintenanceChecklistTemplateDto,
} from './dto/maintenance-checklist-template.dto';
import {
  checklistTemplateContextFromRequest,
  MaintenanceChecklistTemplatesService,
} from './maintenance-checklist-templates.service';

@Controller('maintenance-checklist-templates')
export class MaintenanceChecklistTemplatesController {
  constructor(private readonly templates: MaintenanceChecklistTemplatesService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get()
  list(@Query() query: ListMaintenanceChecklistTemplatesQueryDto): Promise<unknown> {
    return this.templates.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.templates.get(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  create(
    @Body() body: CreateMaintenanceChecklistTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.templates.create(body, actor, checklistTemplateContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateMaintenanceChecklistTemplateDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.templates.update(id, body, actor, checklistTemplateContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':id')
  deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deactivated: true }> {
    return this.templates.deactivate(id, actor, checklistTemplateContextFromRequest(request));
  }
}
