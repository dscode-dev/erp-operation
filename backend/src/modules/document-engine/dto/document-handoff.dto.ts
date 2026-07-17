import {
  DocumentEditorialStatus,
  DocumentHandoffOrigin,
  DocumentTemplateType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);

export class SaveDocumentHandoffDto {
  @IsUUID('4') operationId!: string;
  @IsEnum(DocumentTemplateType) type!: DocumentTemplateType;
}

export class SelectTechnicalSignatureDto {
  @IsUUID('4') signatureId!: string;
}

export class CollectCustomerSignatureDto {
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180) signerName!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) signerRole?: string;
  @IsString() @MaxLength(2_000_000) signatureData!: string;
  @IsOptional() @IsDateString() collectedAt?: string;
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80) timezone!: string;
}

export class FinalizeDocumentReviewDto {
  @IsOptional() @IsBoolean() confirm?: boolean;
}

export class ListDocumentHandoffsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(DocumentEditorialStatus) status?: DocumentEditorialStatus;
  @IsOptional() @IsEnum(DocumentTemplateType) type?: DocumentTemplateType;
  @IsOptional() @IsEnum(DocumentHandoffOrigin) origin?: DocumentHandoffOrigin;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') operatorId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() missingCustomerSignature?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() missingTechnicalSignature?: boolean;
  @IsOptional() @Type(() => Boolean) @IsBoolean() missingEvidence?: boolean;
}
