import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponseDto> {
    const databaseConnected = await this.prisma.isHealthy();

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      uptime: Number(process.uptime().toFixed(3)),
      timestamp: new Date().toISOString(),
      database_connection: databaseConnected ? 'connected' : 'disconnected',
    };
  }
}
