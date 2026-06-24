import { CustomerType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const lower = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const upper = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ListCustomersQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
}

export class CreateCustomerDto {
  @IsEnum(CustomerType) type!: CustomerType;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) name!: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(180)
  tradeName?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)
  cnpj?: string;
  @IsOptional() @Transform(({ value }) => lower(value)) @IsEmail() @MaxLength(254) email?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  phone?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  secondaryPhone?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsEnum(CustomerType) type?: CustomerType;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(180)
  tradeName?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)
  cnpj?: string;
  @IsOptional() @Transform(({ value }) => lower(value)) @IsEmail() @MaxLength(254) email?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  phone?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  secondaryPhone?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
}

export class CustomerAddressDto {
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @Transform(({ value }) => trim(value)) @Matches(/^\d{5}-?\d{3}$/) zipCode!: string;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(180) street!: string;
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) number!: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  complement?: string;
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district!: string;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @Transform(({ value }) => upper(value)) @IsString() @Length(2, 2) state!: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class UpdateCustomerAddressDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @Matches(/^\d{5}-?\d{3}$/) zipCode?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  street?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(20) number?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(120)
  complement?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;
  @IsOptional() @Transform(({ value }) => upper(value)) @IsString() @Length(2, 2) state?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CustomerContactDto {
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(150) name!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) role?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  phone?: string;
  @IsOptional() @Transform(({ value }) => lower(value)) @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class UpdateCustomerContactDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) role?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  phone?: string;
  @IsOptional() @Transform(({ value }) => lower(value)) @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class UploadCustomerAttachmentDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;
}
