import { BrandAssetType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadBrandAssetDto {
  @IsEnum(BrandAssetType)
  type!: BrandAssetType;
}
