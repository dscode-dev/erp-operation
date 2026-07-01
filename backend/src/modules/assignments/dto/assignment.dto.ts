import { AssignmentStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);

export class ListAssignmentsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsUUID('4') operationId?: string;
  @IsOptional() @IsUUID('4') assignedTo?: string;
  @IsOptional() @IsUUID('4') customerId?: string;
  @IsOptional() @IsUUID('4') equipmentId?: string;
  @IsOptional() @IsEnum(AssignmentStatus) status?: AssignmentStatus;
}

export class CreateAssignmentDto {
  @IsUUID('4') operationId!: string;
  @IsUUID('4') assignedTo!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}

export class ReassignAssignmentDto {
  @IsUUID('4') assignedTo!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}

export class AssignmentNotesDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}

export class RejectAssignmentDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(2000)
  rejectionReason!: string;
}
