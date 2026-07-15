import { Module } from '@nestjs/common';
import { TechnicalCatalogsController } from './technical-catalogs.controller';
import { TechnicalCatalogsService } from './technical-catalogs.service';

@Module({
  controllers: [TechnicalCatalogsController],
  providers: [TechnicalCatalogsService],
  exports: [TechnicalCatalogsService],
})
export class TechnicalCatalogsModule {}
