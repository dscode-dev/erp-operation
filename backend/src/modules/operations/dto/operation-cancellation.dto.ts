import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { OperationPhotoInputDto } from './operation.dto';

const trim = (value: unknown): unknown => typeof value === 'string' ? value.trim() : value;

export class RequestOperationCancellationDto {
  @Transform(({ value }) => trim(value)) @IsString() @MinLength(3) @MaxLength(4000)
  reason!: string;

  @IsUUID('4')
  technicalSignatureId!: string;

  @IsOptional() @IsString() @MaxLength(2_000_000)
  customerSignatureData?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(180)
  customerSignerName?: string;

  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(120)
  customerSignerRole?: string;

  @IsOptional() @IsDateString()
  customerSignedAt?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => OperationPhotoInputDto)
  photos: OperationPhotoInputDto[] = [];
}

export class RescheduleCanceledOperationDto {
  @IsUUID('4') assignedTo!: string;
  @IsDateString() scheduledFor!: string;
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}

export class ApproveOperationCancellationDto {
  @IsOptional() @Transform(({ value }) => trim(value)) @IsString() @MaxLength(2000) notes?: string;
}
