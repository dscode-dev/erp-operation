import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../shared/decorators/public.decorator';
import { RawResponse } from '../../shared/decorators/raw-response.decorator';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@Public()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @RawResponse()
  getMetrics(@Res({ passthrough: true }) response: Response): string {
    response.type('text/plain; version=0.0.4; charset=utf-8');
    return this.metrics.renderPrometheus();
  }
}
