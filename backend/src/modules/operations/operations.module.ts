import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({
  imports: [StorageModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
