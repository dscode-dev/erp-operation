import { Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  MIN_PASSWORD_LENGTH,
  USER_THEMES,
  type UserTheme,
} from '../../../shared/constants/users.constants';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const lowercase = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UserPermissionDto {
  @IsOptional()
  @IsBoolean()
  canFinancial?: boolean;

  @IsOptional()
  @IsBoolean()
  canUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  canReports?: boolean;

  @IsOptional()
  @IsBoolean()
  canSchedules?: boolean;

  @IsOptional()
  @IsBoolean()
  canTemplates?: boolean;
}

export class CreateUserDto {
  @Transform(({ value }) => lowercase(value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(({ value }) => lowercase(value))
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9._-]+$/)
  username!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(30)
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPermissionDto)
  permissions?: UserPermissionDto;
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }) => lowercase(value))
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(({ value }) => lowercase(value))
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9._-]+$/)
  username?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(30)
  @Matches(/^\+?[0-9 ()-]{8,30}$/)
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserPermissionDto)
  permissions?: UserPermissionDto;
}

export class ListUsersQueryDto {
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
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  newPassword!: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(USER_THEMES)
  theme?: UserTheme;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
