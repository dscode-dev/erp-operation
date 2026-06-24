import { Module } from '@nestjs/common';
import { InternalDemoController } from './internal-demo.controller';
import { InternalDemoService } from './internal-demo.service';
import { AppConfigModule } from '../config/app-config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [InternalDemoController],
  providers: [InternalDemoService],
})
export class InternalDemoModule {}
