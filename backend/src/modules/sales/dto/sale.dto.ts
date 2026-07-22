import { SaleStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

const trim = (value: unknown): unknown => typeof value === 'string' ? value.trim() : value;

export class ListSalesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsEnum(SaleStatus) status?: SaleStatus;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class SaleItemInputDto {
  @IsUUID('4') productId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity!: number;
}

export class CreateSaleDto {
  @IsUUID('4') customerId!: string;
  @IsOptional() @IsUUID('4') customerAddressId?: string;
  @IsDateString() soldAt!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650) warrantyDays?: number;
  @IsOptional() @IsDateString() warrantyStartsAt?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) discount?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SaleItemInputDto) items!: SaleItemInputDto[];
}

export class UpdateSaleDto {
  @IsOptional() @IsUUID('4') customerAddressId?: string;
  @IsOptional() @IsDateString() soldAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650) warrantyDays?: number;
  @IsOptional() @IsDateString() warrantyStartsAt?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) discount?: number;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => SaleItemInputDto) items?: SaleItemInputDto[];
}
