import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';

@Module({
  imports: [AssetLifecycleModule],
  controllers: [FinancialController],
  providers: [FinancialService],
  exports: [FinancialService],
})
export class FinancialModule {}
