import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../../infra/storage/storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SignaturesModule } from '../signatures/signatures.module';

@Module({
  imports: [AuthModule, StorageModule, SignaturesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
