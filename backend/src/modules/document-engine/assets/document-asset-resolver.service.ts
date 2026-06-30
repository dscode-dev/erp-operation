import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DOCUMENT_STORAGE_PREFIX } from '../../../shared/constants/document-engine.constants';
import { SIGNATURE_STORAGE_PREFIX } from '../../../shared/constants/signatures.constants';
import {
  STORAGE_PROVIDER_TOKEN,
  type StoredFile,
  type StorageProviderContract,
} from '../../../infra/storage/storage-provider.type';

export interface SaveDocumentPdfInput {
  operationId: string;
  documentType: string;
  content: Buffer;
}

export interface SaveSignatureImageInput {
  content: Buffer;
  extension: 'png' | 'jpg' | 'jpeg';
}

export interface ResolvedAsset {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  contentBase64: string;
}

@Injectable()
export class DocumentAssetResolver {
  constructor(
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storage: StorageProviderContract,
  ) {}

  async saveDocumentPdf(input: SaveDocumentPdfInput): Promise<StoredFile> {
    const storageKey = `${DOCUMENT_STORAGE_PREFIX}/${input.operationId}/${input.documentType.toLowerCase()}-${randomUUID()}.pdf`;
    return this.storage.save({ storageKey, content: input.content });
  }

  getDocumentPdf(storageKey: string): Promise<StoredFile> {
    return this.storage.get(storageKey);
  }

  async saveSignatureImage(input: SaveSignatureImageInput): Promise<StoredFile> {
    const storageKey = `${SIGNATURE_STORAGE_PREFIX}/${randomUUID()}.${input.extension}`;
    return this.storage.save({ storageKey, content: input.content });
  }

  getSignatureImage(storageKey: string): Promise<StoredFile> {
    return this.storage.get(storageKey);
  }

  async resolveSignature(
    storageKey: string,
    metadata: { mimeType: string; fileSize: number },
  ): Promise<ResolvedAsset> {
    const stored = await this.storage.get(storageKey);
    return {
      storageKey,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
      contentBase64: stored.content.toString('base64'),
    };
  }

  async resolveLogo(storageKey: string, metadata: { mimeType: string; fileSize: number }): Promise<ResolvedAsset> {
    const stored = await this.storage.get(storageKey);
    return { storageKey, mimeType: metadata.mimeType, fileSize: metadata.fileSize, contentBase64: stored.content.toString('base64') };
  }

  async resolveWatermark(storageKey: string, metadata: { mimeType: string; fileSize: number }): Promise<ResolvedAsset> {
    const stored = await this.storage.get(storageKey);
    return { storageKey, mimeType: metadata.mimeType, fileSize: metadata.fileSize, contentBase64: stored.content.toString('base64') };
  }

  async resolveQrCode(storageKey: string, metadata: { mimeType: string; fileSize: number }): Promise<ResolvedAsset> {
    const stored = await this.storage.get(storageKey);
    return { storageKey, mimeType: metadata.mimeType, fileSize: metadata.fileSize, contentBase64: stored.content.toString('base64') };
  }

  async resolveDocumentImage(storageKey: string, metadata: { mimeType: string; fileSize: number }): Promise<ResolvedAsset> {
    const stored = await this.storage.get(storageKey);
    return { storageKey, mimeType: metadata.mimeType, fileSize: metadata.fileSize, contentBase64: stored.content.toString('base64') };
  }

  delete(storageKey: string): Promise<void> {
    return this.storage.delete(storageKey);
  }

  exists(storageKey: string): Promise<boolean> {
    return this.storage.exists(storageKey);
  }
}
