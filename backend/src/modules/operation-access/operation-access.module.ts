import { Module } from '@nestjs/common';
import { OperationAccessService } from './operation-access.service';

@Module({
  providers: [OperationAccessService],
  exports: [OperationAccessService],
})
export class OperationAccessModule {}
