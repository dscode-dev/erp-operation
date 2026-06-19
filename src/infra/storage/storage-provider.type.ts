export const STORAGE_PROVIDERS = ['local', 's3'] as const;

export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];
