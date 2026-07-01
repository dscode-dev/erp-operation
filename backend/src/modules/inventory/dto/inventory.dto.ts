import { StockMovementType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
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
const upper = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class ListProductsQueryDto extends PageQueryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) category?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) brand?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) active?: boolean;
}

export class CreateProductDto {
  @Transform(({ value }) => upper(value)) @IsString() @MinLength(2) @MaxLength(80) sku!: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsString() @MaxLength(80) internalCode?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  manufacturerCode?: string;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @Transform(({ value }) => upper(value)) @IsString() @MinLength(1) @MaxLength(20) unit!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) brand?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) model?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) category?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  technicalDescription?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) weight?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) dimensions?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateProductDto {
  @IsOptional() @Transform(({ value }) => upper(value)) @IsString() @MinLength(2) @MaxLength(80) sku?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsString() @MaxLength(80) internalCode?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  manufacturerCode?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) name?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsString() @MinLength(1) @MaxLength(20) unit?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) brand?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) model?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) category?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  technicalDescription?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) weight?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) dimensions?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ListInventoryQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID('4') productId?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) critical?: boolean;
}

export class UpdateInventoryItemDto {
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) minimumQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) idealQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) reservedQuantity?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(160) location?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateStockMovementDto {
  @IsUUID('4') inventoryItemId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsEnum(StockMovementType) type!: StockMovementType;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(255) reason!: string;
  @IsOptional() @IsUUID('4') operationId?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}

export class ListStockMovementsQueryDto extends PageQueryDto {
  @IsOptional() @IsUUID('4') inventoryItemId?: string;
  @IsOptional() @IsUUID('4') operationId?: string;
  @IsOptional() @IsUUID('4') productId?: string;
  @IsOptional() @IsEnum(StockMovementType) type?: StockMovementType;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class ListSuppliersQueryDto extends PageQueryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === 'true' || value === true) active?: boolean;
}

export class CreateSupplierDto {
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) legalName!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180) tradeName?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(30) document?: string;
  @IsOptional() @IsArray() contacts?: unknown[];
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSupplierDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) legalName?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180) tradeName?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(30) document?: string;
  @IsOptional() @IsArray() contacts?: unknown[];
  @IsOptional() @IsObject() address?: Record<string, unknown>;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateOperationMaterialDto {
  @IsUUID('4') productId!: string;
  @IsUUID('4') inventoryItemId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}
