import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { MAX_SIGNATURE_IMAGE_SIZE_BYTES } from '../../shared/constants/signatures.constants';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateSignatureDto,
  ListSignaturesQueryDto,
  UpsertOwnSignatureDto,
  UpdateSignatureDto,
} from './dto/signature.dto';
import {
  signatureContextFromRequest,
  SignaturesService,
  type SignatureImageResponse,
  type SignatureResponse,
} from './signatures.service';
import type { UploadedSignatureFile } from './types/uploaded-signature-file.type';

@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signatures: SignaturesService) {}

  @Roles(Role.OPERATOR)
  @Get('me')
  own(@CurrentUser() actor: AuthenticatedUser): Promise<SignatureResponse | null> {
    return this.signatures.getOwn(actor.id);
  }

  @Roles(Role.OPERATOR)
  @Post('me')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIGNATURE_IMAGE_SIZE_BYTES, files: 1 },
    }),
  )
  saveOwn(
    @Body() body: UpsertOwnSignatureDto,
    @UploadedFile() file: UploadedSignatureFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SignatureResponse> {
    return this.signatures.upsertOwn(body, file, actor, signatureContextFromRequest(request));
  }

  @Roles(Role.OPERATOR)
  @Get('me/download')
  downloadOwn(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SignatureImageResponse> {
    return this.signatures.downloadOwnImage(actor, signatureContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get()
  list(@Query() query: ListSignaturesQueryDto): Promise<unknown> {
    return this.signatures.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<SignatureResponse> {
    return this.signatures.get(id);
  }

  @Roles(Role.OWNER)
  @Post()
  create(
    @Body() body: CreateSignatureDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SignatureResponse> {
    return this.signatures.create(body, actor, signatureContextFromRequest(request));
  }

  @Roles(Role.OWNER)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateSignatureDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SignatureResponse> {
    return this.signatures.update(id, body, actor, signatureContextFromRequest(request));
  }

  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.signatures.remove(id, actor, signatureContextFromRequest(request));
  }

  @Roles(Role.OWNER)
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIGNATURE_IMAGE_SIZE_BYTES, files: 1 },
    }),
  )
  uploadImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file: UploadedSignatureFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SignatureResponse> {
    return this.signatures.uploadImage(id, file, actor, signatureContextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get(':id/download')
  downloadImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<SignatureImageResponse> {
    return this.signatures.downloadImage(id, actor, signatureContextFromRequest(request));
  }
}
