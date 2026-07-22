import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);

export class ListSignaturesQueryDto {
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
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}

export class CreateSignatureDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  profession?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  professionalCouncil?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80)
  registrationNumber?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  position?: number;
}

export class UpdateSignatureDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  profession?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  professionalCouncil?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80)
  registrationNumber?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000)
  position?: number;
}

export class UpsertOwnSignatureDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  profession?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  professionalCouncil?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(80)
  registrationNumber?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  department?: string;
}
