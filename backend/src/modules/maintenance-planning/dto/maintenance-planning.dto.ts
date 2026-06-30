import {
  MaintenanceExecutionStatus,
  MaintenancePlanType,
  MaintenancePriority,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
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

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  INTERVAL_DAYS = 'INTERVAL_DAYS',
  INTERVAL_MONTHS = 'INTERVAL_MONTHS',
}

export class RecurrenceRuleDto {
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  interval?: number;
}

export class ListMaintenancePlansQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsEnum(MaintenancePlanType) type?: MaintenancePlanType;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;
}

export class ListMaintenanceExecutionsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(MaintenanceExecutionStatus) status?: MaintenanceExecutionStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateMaintenancePlanDto {
  @IsUUID('4') equipmentId!: string;
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name!: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  description?: string;
  @IsEnum(MaintenancePlanType) type!: MaintenancePlanType;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrenceRule!: RecurrenceRuleDto;
  @IsDateString() firstExecution!: string;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;
}

export class UpdateMaintenancePlanDto {
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  name?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) description?:
    | string
    | null;
  @IsOptional() @IsEnum(MaintenancePlanType) type?: MaintenancePlanType;
  @IsOptional() @IsEnum(MaintenancePriority) priority?: MaintenancePriority;
  @IsOptional() @ValidateNested() @Type(() => RecurrenceRuleDto) recurrenceRule?: RecurrenceRuleDto;
  @IsOptional() @IsDateString() firstExecution?: string;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;
}

export class CreateMaintenanceExecutionDto {
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateMaintenanceExecutionDto {
  @IsOptional() @IsUUID('4') operationId?: string | null;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsDateString() executedAt?: string;
  @IsOptional() @IsEnum(MaintenanceExecutionStatus) status?: MaintenanceExecutionStatus;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) notes?:
    | string
    | null;
}
