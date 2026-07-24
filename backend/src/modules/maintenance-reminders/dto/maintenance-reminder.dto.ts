import { MaintenanceReminderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min, Max } from 'class-validator';

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class ListMaintenanceRemindersQueryDto {
  @IsOptional()
  @Transform(({ value }) => toNumber(value, 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => toNumber(value, 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsEnum(MaintenanceReminderStatus)
  status?: MaintenanceReminderStatus;

  @IsOptional()
  @IsUUID('4')
  customerId?: string;
}

export class UpdateMaintenanceReminderDto {
  /** Nova data prevista (adiantar/adiar). Marca o lembrete como ajustado manualmente. */
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MaintenanceReminderStatus)
  status?: MaintenanceReminderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class PmocUpcomingQueryDto {
  @IsUUID('4')
  customerId!: string;
}
