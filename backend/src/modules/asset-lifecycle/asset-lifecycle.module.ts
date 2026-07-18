import { Module } from '@nestjs/common';
import { OperationAccessModule } from '../operation-access/operation-access.module';
import { StorageModule } from '../../infra/storage/storage.module';
import { AssetLifecycleController } from './asset-lifecycle.controller';
import { AssetLifecycleService } from './asset-lifecycle.service';
import { LifecyclePublisher } from './lifecycle-publisher.service';
import { TimelineAssembler } from './timeline-assembler.service';

@Module({
  imports: [StorageModule, OperationAccessModule],
  controllers: [AssetLifecycleController],
  providers: [AssetLifecycleService, LifecyclePublisher, TimelineAssembler],
  exports: [AssetLifecycleService, LifecyclePublisher, TimelineAssembler],
})
export class AssetLifecycleModule {}
