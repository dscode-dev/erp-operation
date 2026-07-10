import { Controller, Get, Query, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { RawResponse } from '../../shared/decorators/raw-response.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  DocumentsPdfExportQueryDto,
  EquipmentsPdfExportQueryDto,
  OperationsPdfExportQueryDto,
} from './dto/list-export.dto';
import { ListExportService, type PdfExportResult } from './list-export.service';

@Controller()
export class ListExportController {
  constructor(private readonly exports: ListExportService) {}

  @RawResponse()
  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('operations/export')
  async operations(
    @Query() query: OperationsPdfExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Buffer> {
    return this.send(response, await this.exports.operations(query));
  }

  @RawResponse()
  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('equipments/export')
  async equipments(
    @Query() query: EquipmentsPdfExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Buffer> {
    return this.send(response, await this.exports.equipments(query));
  }

  @RawResponse()
  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('documents/export')
  async documents(
    @Query() query: DocumentsPdfExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Buffer> {
    return this.send(response, await this.exports.documents(query));
  }

  private send(response: Response, result: PdfExportResult): Buffer {
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.setHeader('Content-Length', String(result.buffer.length));
    response.setHeader('X-Export-Record-Count', String(result.recordCount));
    response.setHeader('X-Export-Page-Count', String(result.pageCount));
    return result.buffer;
  }
}
