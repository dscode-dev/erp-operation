import {
  MaintenanceChecklistResult,
  OperationMaintenanceType,
  OperationStatus,
  OperationType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
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
  ValidateNested,
} from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);
const trimStringArray = (value: unknown): unknown =>
  Array.isArray(value)
    ? (value as unknown[]).map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

export class ListOperationsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsUUID('4') operatorId?: string;
  @IsOptional() @IsEnum(OperationType) type?: OperationType;
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
}

export class OperationChecklistItemDto {
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(200) label!: string;
  @IsBoolean() done!: boolean;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(500) note?: string;
}

export class OperationPhotoInputDto {
  /** Data URL (`data:image/png;base64,...`) captured in the field. */
  @IsString() dataUrl!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(255) caption?: string;
}

export class OperationMaintenanceChecklistItemDto {
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsEnum(OperationMaintenanceType) maintenanceType!: OperationMaintenanceType;
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(500) description!: string;
  @IsBoolean() executed!: boolean;
  @IsOptional() @IsEnum(MaintenanceChecklistResult) result?: MaintenanceChecklistResult;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  observations?: string;
}

export class OperationInspectedEquipmentDto {
  @IsUUID('4') equipmentId!: string;
  @Transform(({ value }) => trim(value)) @IsString() @MaxLength(160) sector!: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(180)
  systemType?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(500)
  currentSituation?: string;
}

export class CreateOperationDto {
  @IsUUID('4') customerId!: string;
  @IsOptional() @IsUUID('4') addressId?: string;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsUUID('4') operatorId?: string;
  @IsEnum(OperationType) type!: OperationType;
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
  @IsOptional() @IsDateString() scheduledFor?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) referenceMonth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2200) referenceYear?: number;
  @IsOptional() @IsEnum(OperationMaintenanceType) maintenanceType?: OperationMaintenanceType;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => OperationMaintenanceChecklistItemDto)
  maintenanceChecklist?: OperationMaintenanceChecklistItemDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OperationInspectedEquipmentDto)
  inspectedEquipments?: OperationInspectedEquipmentDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationChecklistItemDto)
  checklist?: OperationChecklistItemDto[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  observations?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  reportedIssue?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  serviceDescription?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalDiagnosis?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalRecommendations?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionObjective?: string;
  @IsOptional()
  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  technicalOpinionObjectiveItems?: string[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionConditions?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(30000)
  technicalOpinionAnalysis?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionConclusion?: string;
  @IsOptional()
  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  technicalOpinionConclusionItems?: string[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionRecommendations?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(180)
  technicalOpinionResponsible?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  technicalOpinionCrea?: string;
  @IsOptional() @IsString() @MaxLength(2_000_000) signatureData?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180) customerSignerName?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) customerSignerRole?: string;
  @IsOptional() @IsDateString() signedAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationPhotoInputDto)
  photos?: OperationPhotoInputDto[];
}

export class UpdateOperationDto {
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) referenceMonth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2200) referenceYear?: number;
  @IsOptional() @IsEnum(OperationMaintenanceType) maintenanceType?: OperationMaintenanceType;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => OperationMaintenanceChecklistItemDto)
  maintenanceChecklist?: OperationMaintenanceChecklistItemDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OperationInspectedEquipmentDto)
  inspectedEquipments?: OperationInspectedEquipmentDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationChecklistItemDto)
  checklist?: OperationChecklistItemDto[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(5000)
  observations?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(10000)
  reportedIssue?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  serviceDescription?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalDiagnosis?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalRecommendations?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionObjective?: string;
  @IsOptional()
  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  technicalOpinionObjectiveItems?: string[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionConditions?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(30000)
  technicalOpinionAnalysis?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionConclusion?: string;
  @IsOptional()
  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  technicalOpinionConclusionItems?: string[];
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(20000)
  technicalOpinionRecommendations?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(180)
  technicalOpinionResponsible?: string;
  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(100)
  technicalOpinionCrea?: string;
  @IsOptional() @IsString() @MaxLength(2_000_000) signatureData?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180) customerSignerName?: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120) customerSignerRole?: string;
  @IsOptional() @IsDateString() signedAt?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationPhotoInputDto)
  photos?: OperationPhotoInputDto[];
}
