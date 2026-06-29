import { Module } from '@nestjs/common';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';

@Module({
  imports: [DocumentEngineModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
  exports: [SignaturesService],
})
export class SignaturesModule {}
