import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

function trim(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function uppercase(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

function lowercase(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(180)
  legalName?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  tradeName?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)
  cnpj?: string;

  @IsOptional()
  @Transform(({ value }) => lowercase(value))
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional() @Transform(({ value }) => lowercase(value)) @IsUrl({ require_protocol: true }) @MaxLength(255)
  website?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(10) zipCode?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180) street?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) number?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) complement?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) district?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @Transform(({ value }) => uppercase(value))
  @IsString()
  @Length(2, 2)
  state?: string;

  @IsOptional()
  @Transform(({ value }) => uppercase(value))
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @Transform(({ value }) => uppercase(value))
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(80)
  segment?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @IsOptional()
  @Transform(({ value }) => uppercase(value))
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @Transform(({ value }) => uppercase(value))
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/)
  documentPrefix?: string;
}
