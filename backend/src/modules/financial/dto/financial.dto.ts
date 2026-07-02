import {
  FinancialAccountType,
  FinancialCategoryType,
  FinancialEntryOrigin,
  FinancialEntryStatus,
  FinancialEntryType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const upper = (value: unknown): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const bool = (value: unknown): unknown => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value);

export class FinancialPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class ListFinancialAccountsQueryDto extends FinancialPageQueryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialAccountType) type?: FinancialAccountType;
  @IsOptional() @Transform(({ value }) => bool(value)) @IsBoolean() active?: boolean;
}

export class CreateFinancialAccountDto {
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(140) name!: string;
  @Transform(({ value }) => upper(value)) @IsEnum(FinancialAccountType) type!: FinancialAccountType;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) openingBalance = 0;
  @IsOptional() @Transform(({ value }) => bool(value)) @IsBoolean() active?: boolean;
}

export class UpdateFinancialAccountDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialAccountType) type?: FinancialAccountType;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Transform(({ value }) => bool(value)) @IsBoolean() active?: boolean;
}

export class ListFinancialCategoriesQueryDto extends FinancialPageQueryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialCategoryType) type?: FinancialCategoryType;
  @IsOptional() @Transform(({ value }) => bool(value)) @IsBoolean() active?: boolean;
}

export class CreateFinancialCategoryDto {
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(140) name!: string;
  @Transform(({ value }) => upper(value)) @IsEnum(FinancialCategoryType) type!: FinancialCategoryType;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) color?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80) icon?: string;
  @IsOptional() @Transform(({ value }) => bool(value)) @IsBoolean() active?: boolean;
}

export class UpdateFinancialCategoryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialCategoryType) type?: FinancialCategoryType;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) color?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80) icon?: string;
  @IsOptional() @Transform(({ value }) => bool(value)) @IsBoolean() active?: boolean;
}

export class ListFinancialEntriesQueryDto extends FinancialPageQueryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsUUID('4') accountId?: string;
  @IsOptional() @IsUUID('4') categoryId?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryType) type?: FinancialEntryType;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryOrigin) origin?: FinancialEntryOrigin;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryStatus) status?: FinancialEntryStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateFinancialEntryDto {
  @IsUUID('4') accountId!: string;
  @IsUUID('4') categoryId!: string;
  @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryType) type!: FinancialEntryType;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryOrigin) origin?: FinancialEntryOrigin;
  @IsOptional() @IsUUID('4') originId?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsDateString() dueDate!: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) description!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryStatus) status?: FinancialEntryStatus;
}

export class UpdateFinancialEntryDto {
  @IsOptional() @IsUUID('4') accountId?: string;
  @IsOptional() @IsUUID('4') categoryId?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryType) type?: FinancialEntryType;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsEnum(FinancialEntryOrigin) origin?: FinancialEntryOrigin;
  @IsOptional() @IsUUID('4') originId?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount?: number;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) description?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
}

export class PayFinancialEntryDto {
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}

export class CancelFinancialEntryDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) reason?: string;
}
