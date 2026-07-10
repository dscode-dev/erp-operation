import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { ListExportController } from './list-export.controller';
import { ListExportService } from './list-export.service';

@Module({
  imports: [DatabaseModule, DocumentEngineModule],
  controllers: [ListExportController],
  providers: [ListExportService],
})
export class ListExportModule {}
