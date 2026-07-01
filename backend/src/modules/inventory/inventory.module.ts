import { Module } from '@nestjs/common';
import { AssetLifecycleModule } from '../asset-lifecycle/asset-lifecycle.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { OperationMaterialsController } from './operation-materials.controller';
import { ProductsController } from './products.controller';
import { SuppliersController } from './suppliers.controller';

@Module({
  imports: [AssetLifecycleModule],
  controllers: [ProductsController, InventoryController, SuppliersController, OperationMaterialsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
