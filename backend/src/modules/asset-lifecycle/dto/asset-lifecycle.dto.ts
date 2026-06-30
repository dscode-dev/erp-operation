import { AssetLifecycleEventType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);

export class ListAssetLifecycleQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') operationId?: string;
  @IsOptional() @IsEnum(AssetLifecycleEventType) type?: AssetLifecycleEventType;
  @IsOptional() @IsUUID('4') performedBy?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateAssetLifecycleEventDto {
  @IsUUID('4') equipmentId!: string;
  @IsOptional() @IsUUID('4') operationId?: string;
  @IsOptional() @IsUUID('4') documentId?: string;
  @IsEnum(AssetLifecycleEventType) type!: AssetLifecycleEventType;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsUUID('4') performedBy?: string;
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  description!: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UploadAssetLifecycleAttachmentDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category = 'DOCUMENT';
}
