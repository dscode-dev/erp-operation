import { Controller, Get, Param, ParseEnumPipe, ParseUUIDPipe } from '@nestjs/common';
import { DocumentTemplateType, Role } from '@prisma/client';
import { Roles } from '../../../shared/decorators/roles.decorator';
import {
  DocumentConfigurationService,
  type DocumentConfiguration,
} from './document-configuration.service';

@Controller('documents/configuration')
export class DocumentConfigurationController {
  constructor(private readonly configuration: DocumentConfigurationService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get()
  list(): Promise<DocumentConfiguration[]> {
    return this.configuration.listConfigurations();
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get('types/:type')
  getByType(
    @Param('type', new ParseEnumPipe(DocumentTemplateType)) type: DocumentTemplateType,
  ): Promise<DocumentConfiguration> {
    return this.configuration.getConfigurationForType(type);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER)
  @Get('templates/:templateId')
  getByTemplate(
    @Param('templateId', new ParseUUIDPipe({ version: '4' })) templateId: string,
  ): Promise<DocumentConfiguration> {
    return this.configuration.getConfigurationByTemplate(templateId);
  }
}
