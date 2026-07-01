import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateProductPricingDto,
  ListPricingQueryDto,
  PricingStatsQueryDto,
  UpdateProductPricingDto,
} from './dto/pricing.dto';
import { PricingService, type PricingAuditContext } from './pricing.service';

@Controller()
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('pricing/stats')
  stats(@Query() query: PricingStatsQueryDto): Promise<unknown> {
    return this.pricing.pricingStats(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('pricing')
  list(@Query() query: ListPricingQueryDto): Promise<unknown> {
    return this.pricing.listPricing(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('pricing/:id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.pricing.getPricing(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('products/:id/pricing')
  getProductPricing(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.pricing.getProductPricing(id);
  }

  @Roles(Role.OWNER)
  @Post('products/:id/pricing')
  createProductPricing(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateProductPricingDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.pricing.createProductPricing(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER)
  @Patch('pricing/:id')
  updatePricing(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateProductPricingDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.pricing.createPricingRevision(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('pricing/history/:productId')
  history(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query() query: ListPricingQueryDto,
  ): Promise<unknown> {
    return this.pricing.pricingHistory(productId, query);
  }

  private context(request: RequestWithId): PricingAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
