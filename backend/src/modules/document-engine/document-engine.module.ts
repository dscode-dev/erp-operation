import { Module } from '@nestjs/common';
import { StorageModule } from '../../infra/storage/storage.module';
import { DocumentAssetResolver } from './assets/document-asset-resolver.service';
import { DocumentBuilderService } from './builder/document-builder.service';
import { DocumentConfigurationController } from './configuration/document-configuration.controller';
import { DocumentConfigurationService } from './configuration/document-configuration.service';
import { LayoutEngine } from './layout/layout-engine.service';
import { DocumentMeasureService } from './measurement/document-measure.service';
import { DefaultSignaturePolicyResolver } from './signatures/default-signature-policy.resolver';
import { DocumentEngineController } from './document-engine.controller';
import { DocumentEngineService } from './document-engine.service';
import { PdfEngineService } from './pdf/pdf-engine.service';
import { DocumentRendererService } from './renderer/document-renderer.service';

@Module({
  imports: [StorageModule],
  controllers: [DocumentEngineController, DocumentConfigurationController],
  providers: [
    DocumentEngineService,
    DocumentBuilderService,
    DocumentRendererService,
    PdfEngineService,
    DefaultSignaturePolicyResolver,
    DocumentAssetResolver,
    LayoutEngine,
    DocumentMeasureService,
    DocumentConfigurationService,
  ],
  exports: [
    DocumentAssetResolver,
    LayoutEngine,
    DocumentMeasureService,
    DocumentConfigurationService,
  ],
})
export class DocumentEngineModule {}
