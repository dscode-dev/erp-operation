import { DocumentTemplateType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class OperationDocumentParamsDto {
  @IsUUID('4') operationId!: string;
  @IsEnum(DocumentTemplateType) type!: DocumentTemplateType;
}

export class DocumentIdParamsDto {
  @IsUUID('4') documentId!: string;
}

export class TemplatePreviewParamsDto {
  @IsUUID('4') templateId!: string;
}
