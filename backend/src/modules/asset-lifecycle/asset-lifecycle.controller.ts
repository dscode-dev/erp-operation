import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { MAX_ASSET_LIFECYCLE_ATTACHMENT_SIZE_BYTES } from '../../shared/constants/asset-lifecycle.constants';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateAssetLifecycleEventDto,
  ListAssetLifecycleQueryDto,
  UploadAssetLifecycleAttachmentDto,
} from './dto/asset-lifecycle.dto';
import { AssetLifecycleService } from './asset-lifecycle.service';
import type { AssetLifecycleAuditContext } from './asset-lifecycle.types';
import type { UploadedAssetLifecycleFile } from './types/uploaded-asset-lifecycle-file.type';

@Controller()
export class AssetLifecycleController {
  constructor(private readonly lifecycle: AssetLifecycleService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('asset-lifecycle')
  list(@Query() query: ListAssetLifecycleQueryDto): Promise<unknown> {
    return this.lifecycle.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('asset-lifecycle/:id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.lifecycle.get(id);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post('asset-lifecycle')
  create(
    @Body() body: CreateAssetLifecycleEventDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.lifecycle.create(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('equipments/:id/lifecycle')
  listForEquipment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListAssetLifecycleQueryDto,
  ): Promise<unknown> {
    return this.lifecycle.listForEquipment(id, query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('equipments/:id/lifecycle/stats')
  stats(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.lifecycle.stats(id);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('asset-lifecycle/:id/attachments')
  listAttachments(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<unknown> {
    return this.lifecycle.listAttachments(id);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post('asset-lifecycle/:id/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ASSET_LIFECYCLE_ATTACHMENT_SIZE_BYTES, files: 1 },
    }),
  )
  uploadAttachment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UploadAssetLifecycleAttachmentDto,
    @UploadedFile() file: UploadedAssetLifecycleFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.lifecycle.uploadAttachment(id, body.category, file, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Delete('asset-lifecycle/:id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('attachmentId', new ParseUUIDPipe({ version: '4' })) attachmentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.lifecycle.deleteAttachment(id, attachmentId, actor, this.context(request));
  }

  private context(request: RequestWithId): AssetLifecycleAuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip || null,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
