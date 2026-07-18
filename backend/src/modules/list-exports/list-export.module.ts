import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { DocumentEngineModule } from '../document-engine/document-engine.module';
import { OperationAccessModule } from '../operation-access/operation-access.module';
import { ListExportController } from './list-export.controller';
import { ListExportService } from './list-export.service';

@Module({
  imports: [DatabaseModule, DocumentEngineModule, OperationAccessModule],
  controllers: [ListExportController],
  providers: [ListExportService],
})
export class ListExportModule {}
