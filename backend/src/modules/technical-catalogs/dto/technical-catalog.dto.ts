import {
  OperationMaintenanceType,
  TechnicalCatalogArea,
  TechnicalCatalogType,
  TechnicalCatalogWorkflow,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const boolean = (value: unknown): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;
const enumList = (value: unknown): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export class ListTechnicalCatalogsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(TechnicalCatalogType) type?: TechnicalCatalogType;
  @IsOptional() @IsEnum(OperationMaintenanceType) maintenanceType?: OperationMaintenanceType;
  @IsOptional()
  @Transform(({ value }) => enumList(value))
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsEnum(TechnicalCatalogArea, { each: true })
  areas?: TechnicalCatalogArea[];
  @IsOptional() @IsEnum(TechnicalCatalogWorkflow) workflow?: TechnicalCatalogWorkflow;
  @IsOptional()
  @Transform(({ value }) => enumList(value))
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsEnum(TechnicalCatalogWorkflow, { each: true })
  workflowsAny?: TechnicalCatalogWorkflow[];
  @IsOptional() @Transform(({ value }) => boolean(value)) @IsBoolean() includeGeneral?: boolean;
  @IsOptional() @Transform(({ value }) => boolean(value)) @IsBoolean() active?: boolean;
  @IsOptional() @IsIn(['sortOrder', 'title', 'updatedAt']) sortBy = 'sortOrder';
  @IsOptional() @IsIn(['asc', 'desc']) order = 'asc';
}

export class CreateTechnicalCatalogDto {
  @IsEnum(TechnicalCatalogType) type!: TechnicalCatalogType;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(500) title!: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  description?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsEnum(TechnicalCatalogArea, { each: true })
  areas?: TechnicalCatalogArea[];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsEnum(TechnicalCatalogWorkflow, { each: true })
  workflows?: TechnicalCatalogWorkflow[];
  @IsOptional() @IsEnum(OperationMaintenanceType) maintenanceType?: OperationMaintenanceType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateTechnicalCatalogDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  title?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  description?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsEnum(TechnicalCatalogArea, { each: true })
  areas?: TechnicalCatalogArea[];
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsEnum(TechnicalCatalogWorkflow, { each: true })
  workflows?: TechnicalCatalogWorkflow[];
  @IsOptional() @IsEnum(OperationMaintenanceType) maintenanceType?: OperationMaintenanceType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) sortOrder?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class TechnicalCatalogOrderItemDto {
  @IsUUID('4') id!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(100000) sortOrder!: number;
}

export class ReorderTechnicalCatalogDto {
  @IsEnum(TechnicalCatalogType) type!: TechnicalCatalogType;
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TechnicalCatalogOrderItemDto)
  items!: TechnicalCatalogOrderItemDto[];
}
