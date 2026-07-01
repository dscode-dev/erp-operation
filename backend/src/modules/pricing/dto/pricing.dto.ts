import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PricingPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class ListPricingQueryDto extends PricingPageQueryDto {
  @IsOptional() @IsUUID('4') productId?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === true || value === 'true') active?: boolean;
  @IsOptional() @IsDateString() at?: string;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === true || value === 'true') expired?: boolean;
}

export class PricingStatsQueryDto {
  @IsOptional() @IsDateString() at?: string;
}

export class CreateProductPricingDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) costPrice!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) replacementCost!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) averageCost!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salePrice!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) minimumSalePrice!: number;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) suggestedSalePrice!: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999.99) marginPercentage?: number;
  @IsDateString() validFrom!: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateProductPricingDto {
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) costPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) replacementCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) averageCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) salePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) minimumSalePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) suggestedSalePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999.99) marginPercentage?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
