import { DocumentTemplateType, SignatureMode } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateDocumentTemplateDto {
  @IsEnum(DocumentTemplateType)
  type!: DocumentTemplateType;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  headerContent!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  footerContent!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  observations!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSignature?: boolean;

  @IsOptional()
  @IsEnum(SignatureMode)
  signatureMode?: SignatureMode;

  @IsOptional()
  @IsUUID('4')
  signatureId?: string | null;
}

export class UpdateDocumentTemplateDto {
  @IsOptional()
  @IsEnum(DocumentTemplateType)
  type?: DocumentTemplateType;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  headerContent?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  footerContent?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  observations?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSignature?: boolean;

  @IsOptional()
  @IsEnum(SignatureMode)
  signatureMode?: SignatureMode;

  @IsOptional()
  @IsUUID('4')
  signatureId?: string | null;
}
