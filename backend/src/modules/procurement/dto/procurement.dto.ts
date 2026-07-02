import { PurchaseOrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
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
const upper = (value: unknown): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class ProcurementPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class ListPurchaseOrdersQueryDto extends ProcurementPageQueryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsUUID('4') supplierId?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreatePurchaseOrderDto {
  @IsUUID('4') supplierId!: string;
  @IsOptional() @IsDateString() expectedDelivery?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
}

export class UpdatePurchaseOrderDto {
  @IsOptional() @IsUUID('4') supplierId?: string;
  @IsOptional() @IsDateString() expectedDelivery?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
}

export class CreatePurchaseOrderItemDto {
  @IsUUID('4') productId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) unit?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) snapshotCost!: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) snapshotDescription?: string;
}

export class UpdatePurchaseOrderItemDto {
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) snapshotCost?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(1) @MaxLength(2000) snapshotDescription?: string;
}

export class PurchaseReceiptLineDto {
  @IsUUID('4') itemId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
}

export class CreatePurchaseReceiptDto {
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseReceiptLineDto) items!: PurchaseReceiptLineDto[];
}
