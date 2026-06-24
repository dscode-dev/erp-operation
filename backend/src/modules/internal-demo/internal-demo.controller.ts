import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../shared/decorators/roles.decorator';
import { InternalDemoService } from './internal-demo.service';

@Controller('internal/demo')
export class InternalDemoController {
  constructor(private readonly demo: InternalDemoService) {}

  @Roles(Role.OWNER)
  @Get('dataset')
  dataset(): Promise<Record<string, unknown>> {
    return this.demo.dataset();
  }

  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.OK)
  @Post('reset')
  reset(): Promise<{
    reset: true;
    organization: string;
    usersCreated: string[];
    usersPreserved: string[];
    snapshotKeys: string[];
  }> {
    return this.demo.reset();
  }
}
