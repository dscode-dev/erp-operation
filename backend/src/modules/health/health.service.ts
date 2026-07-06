import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER_TOKEN, type StorageProviderContract } from '../../infra/storage/storage-provider.type';
import { PrismaService } from '../database/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProviderContract,
  ) {}

  async getHealth(): Promise<HealthResponseDto> {
    return this.getReadiness();
  }

  getLiveness(): HealthResponseDto {
    return {
      status: 'ok',
      uptime: Number(process.uptime().toFixed(3)),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }

  async getReadiness(): Promise<HealthResponseDto> {
    const databaseConnected = await this.prisma.isHealthy();
    const storageAvailable = await this.isStorageHealthy();

    return {
      status: databaseConnected && storageAvailable ? 'ok' : 'degraded',
      uptime: Number(process.uptime().toFixed(3)),
      timestamp: new Date().toISOString(),
      database_connection: databaseConnected ? 'connected' : 'disconnected',
      storage_connection: storageAvailable ? 'available' : 'unavailable',
      version: process.env.npm_package_version ?? '0.0.0',
    };
  }

  private async isStorageHealthy(): Promise<boolean> {
    try {
      return this.storage.exists('organization/logo');
    } catch {
      return false;
    }
  }
}
