import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [StorageModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
