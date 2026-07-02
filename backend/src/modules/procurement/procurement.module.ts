import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [InventoryModule, AssetLifecycleModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
