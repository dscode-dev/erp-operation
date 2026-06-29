export const DOCUMENT_ENGINE_RESOURCE = 'DOCUMENT_ENGINE';
export const DOCUMENT_RENDER_RESOURCE = 'DOCUMENT_RENDER';

export const DOCUMENT_ENGINE_AUDIT_ACTIONS = {
  DOCUMENT_PREVIEWED: 'DOCUMENT_PREVIEWED',
  DOCUMENT_RENDERED: 'DOCUMENT_RENDERED',
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
} as const;

export const DOCUMENT_MIME_TYPE = 'application/pdf';
export const DOCUMENT_STORAGE_PREFIX = 'documents/operations';
export const DOCUMENT_MAX_SECTIONS = 80;
export const DOCUMENT_MAX_COMPONENTS = 600;
export const DOCUMENT_MAX_TABLE_ROWS = 400;
export const DOCUMENT_MAX_PAGES = 80;
export const DOCUMENT_MAX_PDF_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_PAGE = {
  width: 595.28,
  height: 841.89,
  marginTop: 48,
  marginRight: 42,
  marginBottom: 54,
  marginLeft: 42,
  headerHeight: 72,
  footerHeight: 34,
} as const;

export const FINANCIAL_DOCUMENT_TYPES = ['QUOTE', 'RECEIPT'] as const;
