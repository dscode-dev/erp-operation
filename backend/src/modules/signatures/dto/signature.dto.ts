import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
  professionalCouncil?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
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
  professionalCouncil?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
