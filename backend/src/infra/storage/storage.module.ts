import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../modules/config/app-config.module';
import { LocalStorageProvider } from './local-storage.provider';
import { STORAGE_PROVIDER_TOKEN } from './storage-provider.type';

@Module({
  imports: [AppConfigModule],
  providers: [
    LocalStorageProvider,
    {
      provide: STORAGE_PROVIDER_TOKEN,
      useExisting: LocalStorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER_TOKEN],
})
export class StorageModule {}
