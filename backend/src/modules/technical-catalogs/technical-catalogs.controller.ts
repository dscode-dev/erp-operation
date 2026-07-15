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
  CreateTechnicalCatalogDto,
  ListTechnicalCatalogsQueryDto,
  ReorderTechnicalCatalogDto,
  UpdateTechnicalCatalogDto,
} from './dto/technical-catalog.dto';
import {
  technicalCatalogContextFromRequest,
  TechnicalCatalogsService,
} from './technical-catalogs.service';

@Controller('technical-catalogs')
export class TechnicalCatalogsController {
  constructor(private readonly catalogs: TechnicalCatalogsService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('types')
  types(): Array<{ value: string; label: string }> {
    return this.catalogs.types();
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('taxonomy')
  taxonomy(): ReturnType<TechnicalCatalogsService['taxonomy']> {
    return this.catalogs.taxonomy();
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get()
  list(@Query() query: ListTechnicalCatalogsQueryDto): Promise<unknown> {
    return this.catalogs.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('reorder')
  reorder(
    @Body() body: ReorderTechnicalCatalogDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ reordered: number }> {
    return this.catalogs.reorder(body, actor, technicalCatalogContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.catalogs.get(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  create(
    @Body() body: CreateTechnicalCatalogDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.catalogs.create(body, actor, technicalCatalogContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateTechnicalCatalogDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.catalogs.update(id, body, actor, technicalCatalogContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.catalogs.remove(id, actor, technicalCatalogContextFromRequest(request));
  }
}
