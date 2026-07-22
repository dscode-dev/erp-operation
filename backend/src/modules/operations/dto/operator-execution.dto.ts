import { OperationStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const trim = (value: unknown): unknown => (typeof value === 'string' ? value.trim() : value);

export enum OperatorExecutionView {
  HISTORY = 'HISTORY',
  AGENDA = 'AGENDA',
}

export class OperatorExecutionPeriodDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}

export class ListOperatorExecutionsQueryDto extends OperatorExecutionPeriodDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(100) search?: string;
}

export class ListOperatorExecutionOperationsQueryDto extends OperatorExecutionPeriodDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsEnum(OperationStatus) status?: OperationStatus;
  @IsOptional() @IsEnum(OperatorExecutionView) view = OperatorExecutionView.HISTORY;
}
