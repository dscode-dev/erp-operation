export const STORAGE_PROVIDERS = ['local', 's3'] as const;
export const STORAGE_DRIVERS = ['local'] as const;

export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];
export type StorageDriver = (typeof STORAGE_DRIVERS)[number];

export const STORAGE_PROVIDER_TOKEN = Symbol('STORAGE_PROVIDER_TOKEN');

export interface StorageSaveInput {
  storageKey: string;
  content: Buffer;
}

export interface StoredFile {
  storageKey: string;
  content: Buffer;
}

export interface StorageProviderContract {
  save(input: StorageSaveInput): Promise<StoredFile>;
  get(storageKey: string): Promise<StoredFile>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
