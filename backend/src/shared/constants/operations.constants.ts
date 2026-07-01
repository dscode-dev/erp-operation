export const OPERATION_RESOURCE = 'OPERATION';
export const OPERATION_DOCUMENT_RESOURCE = 'OPERATION_DOCUMENT';
export const OPERATION_PHOTO_RESOURCE = 'OPERATION_PHOTO';

export const OPERATION_AUDIT_ACTIONS = {
  OPERATION_CREATED: 'OPERATION_CREATED',
  OPERATION_DELEGATED: 'OPERATION_DELEGATED',
  OPERATION_UPDATED: 'OPERATION_UPDATED',
  OPERATION_DOCUMENT_CREATED: 'OPERATION_DOCUMENT_CREATED',
} as const;

export const MAX_OPERATION_PHOTOS = 16;
export const MAX_OPERATION_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const OPERATION_PHOTO_MIME_TYPES = ['image/png', 'image/jpeg'] as const;

/** Document number prefixes per produced document type. */
export const OPERATION_DOCUMENT_PREFIX: Record<string, string> = {
  WORK_ORDER: 'OS',
  QUOTE: 'ORC',
  RECEIPT: 'REC',
  REPORT: 'REL',
  TECHNICAL_REPORT: 'RVT',
  PMOC: 'PMOC',
};

/** Format an Operation sequential number into a zero-padded document code. */
export function formatDocumentNumber(prefix: string, sequential: number): string {
  return `${prefix}-${String(sequential).padStart(6, '0')}`;
}
