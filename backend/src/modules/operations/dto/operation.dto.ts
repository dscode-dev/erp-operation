import { OperationStatus, OperationType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
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
  ValidateNested,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);

export class ListOperationsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsUUID('4') operatorId?: string;
  @IsOptional() @IsEnum(OperationType) type?: OperationType;
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
}

export class OperationChecklistItemDto {
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) label!: string;
  @IsBoolean() done!: boolean;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(500) note?: string;
}

export class OperationPhotoInputDto {
  /** Data URL (`data:image/png;base64,...`) captured in the field. */
  @IsString() dataUrl!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(255) caption?: string;
}

export class CreateOperationDto {
  @IsUUID('4') customerId!: string;
  @IsOptional() @IsUUID('4') addressId?: string;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsEnum(OperationType) type!: OperationType;
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationChecklistItemDto)
  checklist?: OperationChecklistItemDto[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  observations?: string;
  @IsOptional() @IsString() @MaxLength(2_000_000) signatureData?: string;
  @IsOptional() @IsDateString() signedAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationPhotoInputDto)
  photos?: OperationPhotoInputDto[];
}

export class UpdateOperationDto {
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationChecklistItemDto)
  checklist?: OperationChecklistItemDto[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  observations?: string;
}
