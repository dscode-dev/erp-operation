import { OperationMaintenanceType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const boolean = (value: unknown): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListMaintenanceChecklistTemplatesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(OperationMaintenanceType)
  maintenanceType?: OperationMaintenanceType;

  @IsOptional()
  @Transform(({ value }) => boolean(value))
  @IsBoolean()
  active?: boolean;
}

export class CreateMaintenanceChecklistTemplateDto {
  @IsEnum(OperationMaintenanceType)
  maintenanceType!: OperationMaintenanceType;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateMaintenanceChecklistTemplateDto {
  @IsOptional()
  @IsEnum(OperationMaintenanceType)
  maintenanceType?: OperationMaintenanceType;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
