import { OperationMaintenanceType, RvtExecutionStatus, RvtPlanStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
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
} from 'class-validator';

const trim = (value: unknown): unknown => typeof value === 'string' ? value.trim() : value;

export class ListRvtPlansQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsEnum(RvtPlanStatus) status?: RvtPlanStatus;
}

export class CreateRvtPlanDto {
  @IsUUID('4') customerId!: string;
  @IsUUID('4') addressId!: string;
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsEnum(OperationMaintenanceType) maintenanceType!: OperationMaintenanceType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsUUID('4') responsibleTechnicianId!: string;
  @IsOptional() @IsUUID('4') defaultOperatorId?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @IsUUID('4', { each: true }) equipmentIds!: string[];
  @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4', { each: true }) checklistCatalogIds!: string[];
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) observations?: string;
}

export class UpdateRvtPlanDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @IsUUID('4') addressId?: string;
  @IsOptional() @IsEnum(OperationMaintenanceType) maintenanceType?: OperationMaintenanceType;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID('4') responsibleTechnicianId?: string;
  @IsOptional() @IsUUID('4') defaultOperatorId?: string | null;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @ArrayUnique() @IsUUID('4', { each: true }) equipmentIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4', { each: true }) checklistCatalogIds?: string[];
  @IsOptional() @IsEnum(RvtPlanStatus) status?: RvtPlanStatus;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(5000) observations?: string | null;
}

export class ListRvtExecutionsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(RvtExecutionStatus) status?: RvtExecutionStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class PrepareRvtExecutionDto {
  @IsOptional() @IsUUID('4') operatorId?: string;
}

export class RegisterAdHocRvtDto {
  @IsUUID('4') operationId!: string;
}
