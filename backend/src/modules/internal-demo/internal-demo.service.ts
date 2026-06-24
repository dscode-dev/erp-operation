import { HttpStatus, Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../infra/logger/app-logger.service';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import { resetDemoData } from '../../seeds/demo/demo.seed';
import { DEMO_MANIFEST_KEY } from '../../seeds/demo/demo.constants';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InternalDemoService {
  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  async reset(): Promise<{
    reset: true;
    organization: string;
    usersCreated: string[];
    usersPreserved: string[];
    snapshotKeys: string[];
  }> {
    this.ensureEnabled();

    const result = await resetDemoData(this.prisma, {
      log: (event) => this.logger.info('Demo seed event', event),
    });
    return {
      reset: true,
      organization: result.organization,
      usersCreated: result.usersCreated,
      usersPreserved: result.usersPreserved,
      snapshotKeys: result.snapshotKeys,
    };
  }

  async dataset(): Promise<Record<string, unknown>> {
    this.ensureEnabled();
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'demo.',
          not: DEMO_MANIFEST_KEY,
        },
      },
      orderBy: { key: 'asc' },
      select: { key: true, value: true },
    });
    return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  }

  private ensureEnabled(): void {
    if (
      this.config.nodeEnv === 'development' &&
      this.config.enableDemoData &&
      this.config.enableDemoEndpoints
    ) {
      return;
    }
    throw new ApplicationException(
      ERROR_CODES.DEMO_ENDPOINT_DISABLED,
      'Demo endpoints are disabled',
      HttpStatus.NOT_FOUND,
    );
  }
}
