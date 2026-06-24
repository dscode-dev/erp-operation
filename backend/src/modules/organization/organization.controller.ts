import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { MAX_BRAND_ASSET_SIZE_BYTES } from '../../shared/constants/organization.constants';
import { UploadBrandAssetDto } from './dto/brand-asset.dto';
import { CreateDocumentTemplateDto, UpdateDocumentTemplateDto } from './dto/document-template.dto';
import { UpdateOrganizationDto, UpdateOrganizationSettingsDto } from './dto/organization.dto';
import {
  OrganizationService,
  type AssetContentResponse,
  type AssetResponse,
  type OrganizationResponse,
  type RequestAuditContext,
  type SettingsResponse,
  type TemplateResponse,
} from './organization.service';
import type { UploadedAssetFile } from './types/uploaded-file.type';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Get()
  getOrganization(): Promise<OrganizationResponse> {
    return this.organization.getOrganization();
  }

  @Roles(Role.OWNER)
  @Patch()
  updateOrganization(
    @Body() body: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<OrganizationResponse> {
    return this.organization.updateOrganization(body, user, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('settings')
  getSettings(): Promise<SettingsResponse> {
    return this.organization.getSettings();
  }

  @Roles(Role.OWNER)
  @Patch('settings')
  updateSettings(
    @Body() body: UpdateOrganizationSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SettingsResponse> {
    return this.organization.updateSettings(body, user, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('templates')
  listTemplates(): Promise<TemplateResponse[]> {
    return this.organization.listTemplates();
  }

  @Roles(Role.OWNER)
  @Post('templates')
  createTemplate(
    @Body() body: CreateDocumentTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<TemplateResponse> {
    return this.organization.createTemplate(body, user, this.context(request));
  }

  @Roles(Role.OWNER)
  @Patch('templates/:id')
  updateTemplate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateDocumentTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<TemplateResponse> {
    return this.organization.updateTemplate(id, body, user, this.context(request));
  }

  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @Delete('templates/:id')
  deleteTemplate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.organization.deleteTemplate(id, user, this.context(request));
  }

  @Roles(Role.OWNER)
  @Post('assets')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_BRAND_ASSET_SIZE_BYTES,
        files: 1,
      },
    }),
  )
  uploadAsset(
    @Body() body: UploadBrandAssetDto,
    @UploadedFile() file: UploadedAssetFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<AssetResponse> {
    return this.organization.uploadAsset(body.type, file, user, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('assets/:id')
  getAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AssetContentResponse> {
    return this.organization.getAsset(id);
  }

  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @Delete('assets/:id')
  deleteAsset(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.organization.deleteAsset(id, user, this.context(request));
  }

  private context(request: RequestWithId): RequestAuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip || null,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
