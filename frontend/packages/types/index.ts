/**
 * Shared API types — single source of truth for backend contracts.
 *
 * Mirrors docs/backend/API_CONTRACTS.md, FRONTEND_INTEGRATION.md and OPUS_INTEGRATION.md.
 * Sprint 1: real domains are Auth, Users/Team, Organization, Customers and Equipments.
 * Dashboard / Schedule / Finance are still served by the development demo bridge.
 */

/* ============ Envelope ============ */

export type ApiSuccess<T> = { success: true; data: T };

export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = { items: T[]; pagination: Pagination };
export type PaginatedTimeline<T> = Paginated<T> & {
  timelineGroups?: Array<{
    date: string;
    count: number;
    items: AssetLifecycleTimelineItem[];
  }>;
};

/* ============ Auth / Roles ============ */

export type Role = "OWNER" | "MANAGER" | "OPERATOR" | "VIEWER";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type LoginPayload = { email: string; password: string };

/* ============ Users / Team ============ */

export type UserTheme = "SYSTEM" | "LIGHT" | "DARK";

export type UserPermissions = {
  canFinancial: boolean;
  canUsers: boolean;
  canReports: boolean;
  canSchedules: boolean;
  canTemplates: boolean;
};

export type UserPreferences = {
  id: string;
  userId: string;
  theme: UserTheme;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TeamUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  avatarAssetId: string | null;
  phone: string | null;
  jobTitle: string | null;
  notes: string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  permission: UserPermissions;
  preferences: UserPreferences | null;
};

/** Shape returned by GET /users/me (the bootstrap session object). */
export type SessionUser = {
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    avatarAssetId: string | null;
    phone: string | null;
    jobTitle: string | null;
    role: Role;
    isActive: boolean;
    mustChangePassword: boolean;
  };
  organization: {
    id: string;
    legalName: string;
    tradeName: string;
    segment: string | null;
    primaryColor: string;
    secondaryColor: string;
    isActive: boolean;
  };
  role: Role;
  permissions: UserPermissions;
  preferences: UserPreferences | null;
};

export type ChangePasswordPayload = { currentPassword: string; newPassword: string };

export type CreateUserPayload = {
  email: string;
  username: string;
  name: string;
  role: Role;
  phone?: string;
  jobTitle?: string;
  notes?: string;
  permissions?: Partial<UserPermissions>;
};

export type UpdateUserPayload = Partial<CreateUserPayload>;

export type CreateUserResult = { user: TeamUser; temporaryPassword: string };

export type ResetPasswordResult = {
  userId: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
};

export type AvatarMeta = {
  id: string;
  storageKey: string;
  mimeType: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
};

/* ============ Organization ============ */

export type BrandAssetType = "LOGO" | "HEADER" | "FOOTER";

export type DocumentTemplateType =
  | "QUOTE"
  | "WORK_ORDER"
  | "RECEIPT"
  | "REPORT"
  | "TECHNICAL_REPORT"
  | "PMOC";

export type SignatureMode = "NONE" | "FIXED" | "COLLECTED" | "HYBRID";

export type Organization = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  segment: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSettings = {
  id: string;
  organizationId: string;
  language: string;
  timezone: string;
  currency: string;
  documentPrefix: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentTemplate = {
  id: string;
  organizationId: string;
  type: DocumentTemplateType;
  name: string;
  headerContent: string;
  footerContent: string;
  observations: string;
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
  requiresSignature: boolean;
  signatureMode: SignatureMode;
  signatureId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Signature = {
  id: string;
  name: string;
  title: string;
  imageStorageKey: string | null;
  mimeType: string | null;
  originalFileName: string | null;
  fileSize: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SignatureImage = Signature & {
  contentBase64: string;
};

export type DocumentConfiguration = {
  type: DocumentTemplateType;
  organization: Pick<
    Organization,
    "id" | "legalName" | "tradeName" | "cnpj" | "email" | "phone" | "city" | "state" | "primaryColor" | "secondaryColor"
  >;
  settings: Pick<OrganizationSettings, "id" | "language" | "timezone" | "currency" | "documentPrefix">;
  defaultTemplate: (DocumentTemplate & { signature?: Signature | null }) | null;
  templates: Array<DocumentTemplate & { signature?: Signature | null }>;
};

export type AssetWithContent = {
  id: string;
  mimeType: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
  contentBase64: string;
};

export type BrandAsset = {
  id: string;
  organizationId: string;
  type: BrandAssetType;
  storageKey: string;
  mimeType: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
};

export type UpdateOrganizationPayload = Partial<{
  legalName: string;
  tradeName: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
}>;

export type UpdateOrganizationSettingsPayload = Partial<{
  language: string;
  timezone: string;
  currency: string;
  documentPrefix: string;
}>;

export type CreateDocumentTemplatePayload = {
  type: DocumentTemplateType;
  name: string;
  headerContent: string;
  footerContent: string;
  observations: string;
  isDefault?: boolean;
  isActive?: boolean;
  requiresSignature?: boolean;
  signatureMode?: SignatureMode;
  signatureId?: string | null;
};

export type UpdateDocumentTemplatePayload = Partial<CreateDocumentTemplatePayload>;

/* ============ Customers ============ */

export type CustomerType = "PERSON" | "COMPANY";

export type CustomerCounts = { addresses: number; contacts: number; attachments: number };

export type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  tradeName: string | null;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  notes: string | null;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: CustomerCounts;
};

export type CustomerAddress = {
  id: string;
  name: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  isPrimary: boolean;
};

export type CustomerContact = {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isPrimary: boolean;
};

export type CustomerAttachment = {
  id: string;
  category: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type CustomerDetail = Customer & {
  addresses: CustomerAddress[];
  contacts: CustomerContact[];
  attachments: CustomerAttachment[];
};

export type CustomerStats = {
  total: number;
  active: number;
  inactive: number;
  people: number;
  companies: number;
};

export type CreateCustomerPayload = {
  type: CustomerType;
  name: string;
  tradeName?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  notes?: string | null;
};

/* ============ Equipments ============ */

export type EquipmentType =
  | "SPLIT"
  | "CHILLER"
  | "CONDENSER"
  | "EVAPORATOR"
  | "AIR_HANDLER"
  | "SOLAR_INVERTER"
  | "ELECTRICAL_PANEL"
  | "GENERATOR"
  | "OTHER";

export type EquipmentStatus = "ACTIVE" | "MAINTENANCE" | "INACTIVE" | "RETIRED";

export type EquipmentCounts = { children: number; attachments: number; metrics: number };

export type EquipmentSummary = {
  id: string;
  type: EquipmentType;
  status: EquipmentStatus;
  name: string;
  tag: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  customer: { id: string; name: string } | null;
  address: { id: string; name: string | null; city: string | null } | null;
  _count?: EquipmentCounts;
  createdAt: string;
  updatedAt: string;
};

export type EquipmentMetric = {
  id: string;
  key: string;
  value: number;
  unit: string | null;
  recordedAt: string;
};

export type EquipmentAttachment = {
  id: string;
  category: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type EquipmentDetail = EquipmentSummary & {
  capacity: string | null;
  voltage: string | null;
  installationDate: string | null;
  warrantyExpiration: string | null;
  observations: string | null;
  qrToken: string;
  qrCode: string;
  parent: { id: string; name: string; tag: string | null } | null;
  children: Array<{ id: string; name: string; tag: string | null; status: EquipmentStatus }>;
  attachments: EquipmentAttachment[];
  metrics: EquipmentMetric[];
};

export type EquipmentStats = {
  total: number;
  active: number;
  maintenance: number;
  inactive: number;
  retired: number;
  byType: Record<EquipmentType, number>;
};

/* ============ Asset Lifecycle ============ */

export type AssetLifecycleEventType =
  | "INSTALLATION"
  | "INSPECTION"
  | "PREVENTIVE"
  | "CORRECTIVE"
  | "MAINTENANCE"
  | "PART_REPLACEMENT"
  | "WARRANTY"
  | "DOCUMENT"
  | "NOTE"
  | "CUSTOM";

export type AssetLifecycleAttachment = {
  id: string;
  eventId?: string;
  storageKey?: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
  deletedAt?: string | null;
  createdAt: string;
};

export type AssetLifecycleTimelineItem = {
  id: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  date: string;
  groupKey: string;
  sortKey: string;
  user: { id: string; name: string; username: string } | null;
  type: AssetLifecycleEventType;
  operationId: string | null;
  documentId: string | null;
  equipmentId: string;
  references: {
    equipment: { id: string; name: string; tag: string | null; type: string; status: string } | null;
    customer: { id: string; name: string; tradeName: string | null } | null;
    operation: { id: string; number: number; type: string; status: string } | null;
    document: {
      id: string;
      number: string;
      type: DocumentTemplateType;
      status: OperationDocumentStatus;
      renderedAt: string | null;
      fileSize: number | null;
    } | null;
  };
  attachments: Array<{
    id: string;
    category: string;
    mimeType: string;
    fileSize: number;
    originalFileName: string;
    createdAt: string;
  }>;
  badges: string[];
};

export type AssetLifecycleEvent = {
  id: string;
  equipmentId: string;
  operationId: string | null;
  documentId: string | null;
  type: AssetLifecycleEventType;
  occurredAt: string;
  performedBy: string | null;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  equipment?: { id: string; name: string; tag: string | null; type: string; status: string } | null;
  operation?: { id: string; number: number; type: string; status: string } | null;
  document?: {
    id: string;
    number: string;
    type: DocumentTemplateType;
    status: OperationDocumentStatus;
    renderedAt?: string | null;
    fileSize?: number | null;
  } | null;
  performer?: { id: string; name: string; email?: string; username: string } | null;
  attachments?: AssetLifecycleAttachment[];
  timeline: AssetLifecycleTimelineItem;
};

export type AssetLifecycleStats = {
  equipmentId: string;
  total: number;
  byType: Record<AssetLifecycleEventType, number>;
  preventiveCount: number;
  correctiveCount: number;
  documentCount: number;
  inspectionCount: number;
  firstInstallation: string | null;
  lastMaintenance: string | null;
  meanDaysBetweenInterventions: number | null;
};

export type CreateEquipmentPayload = {
  customerId: string;
  type: EquipmentType;
  name: string;
  addressId?: string | null;
  parentEquipmentId?: string | null;
  status?: EquipmentStatus;
  tag?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  capacity?: string | null;
  voltage?: string | null;
  installationDate?: string | null;
  warrantyExpiration?: string | null;
  observations?: string | null;
};

/* ============ Operations (central operational domain) ============ */

export type OperationType = "PREVENTIVA" | "CORRETIVA" | "INSTALACAO" | "PROJETO";
export type OperationStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
export type OperationDocumentStatus = "DRAFT" | "READY" | "VALIDATED" | "SENT";

export type OperationChecklistItem = { label: string; done: boolean; note?: string | null };

export type OperationDocument = {
  id: string;
  operationId?: string;
  type: DocumentTemplateType;
  number: string;
  status: OperationDocumentStatus;
  storageKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  renderedAt?: string | null;
  renderMetadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type OperationPhoto = {
  id: string;
  caption: string | null;
  mimeType: string;
  fileSize: number;
  createdAt: string;
};

export type OperationSummary = {
  id: string;
  number: number;
  type: OperationType;
  status: OperationStatus;
  customer: { id: string; name: string } | null;
  equipment: { id: string; name: string } | null;
  operator: { id: string; name: string } | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents: OperationDocument[];
  _count?: { photos: number; documents: number };
};

export type OperationDetail = Omit<OperationSummary, "equipment"> & {
  address: CustomerAddress | null;
  equipment: { id: string; name: string; tag: string | null; type: EquipmentType } | null;
  checklist: OperationChecklistItem[];
  observations: string | null;
  signatureData: string | null;
  signedAt: string | null;
  photos: OperationPhoto[];
  documents: OperationDocument[];
};

export type OperationStats = {
  total: number;
  byStatus: Record<OperationStatus, number>;
};

export type CreateOperationPayload = {
  customerId: string;
  addressId?: string | null;
  equipmentId?: string | null;
  type: OperationType;
  status?: OperationStatus;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  checklist?: OperationChecklistItem[];
  observations?: string | null;
  signatureData?: string | null;
  signedAt?: string | null;
  photos?: { dataUrl: string; caption?: string | null }[];
};

/* ============ Demo bridge (dashboard / schedule / finance) ============ */

export type DemoScheduleState = "OVERDUE" | "IN_PROGRESS" | "SCHEDULED" | "DONE";

export type DemoScheduleItem = {
  id: string;
  title: string;
  customer: string;
  operator: string;
  startsAt: string;
  state: DemoScheduleState;
  /** Enriched fields (optional for backward compatibility). */
  equipment?: string;
  serviceType?: DemoOrderType;
  endsAt?: string;
  notes?: string;
};

export type DemoDataset = {
  "demo.dashboard.v1": {
    generatedAt: string;
    counters: {
      atendimentosHoje: number;
      ordensPendentes: number;
      operadoresAtivos: number;
      servicosEmAndamento: number;
    };
  };
  "demo.schedule.v1": {
    generatedAt: string;
    items: DemoScheduleItem[];
  };
  "demo.finance.v1": {
    generatedAt: string;
    currency: "BRL";
    summary: {
      entradas: number;
      saidas: number;
      despesas: number;
      projecao30Dias: number;
    };
    entries: Array<{
      id: string;
      kind: "ENTRY" | "EXPENSE";
      description: string;
      amount: number;
    }>;
  };
  /** Commercial-demo snapshots (no production domain yet). */
  "demo.orders.v1": {
    generatedAt: string;
    items: DemoOrder[];
  };
  "demo.products.v1": {
    generatedAt: string;
    items: DemoProduct[];
  };
  "demo.documents.v1": {
    generatedAt: string;
    items: DemoDocument[];
  };
  "demo.services.v1": {
    generatedAt: string;
    items: DemoService[];
  };
};

export type DemoOrderStatus = "OVERDUE" | "IN_PROGRESS" | "SCHEDULED" | "DONE";
export type DemoOrderType = "PREVENTIVA" | "CORRETIVA" | "INSTALACAO" | "PROJETO";

export type DemoOrder = {
  id: string;
  number: string;
  title: string;
  customer: string;
  type: DemoOrderType;
  operator: string;
  value: number;
  scheduledFor: string;
  status: DemoOrderStatus;
};

export type DemoProductStatus = "ok" | "low" | "out";

export type DemoProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
  status: DemoProductStatus;
};

export type DemoDocumentStatus = "DRAFT" | "READY" | "VALIDATED" | "SENT";

export type DemoDocument = {
  id: string;
  /** Maps to DocumentTemplateType (WORK_ORDER, TECHNICAL_REPORT, PMOC, REPORT, QUOTE, RECEIPT). */
  kind: DocumentTemplateType;
  number: string;
  customer: string;
  equipment: string;
  operator: string;
  date: string;
  status: DemoDocumentStatus;
  value: number;
};

export type DemoServiceStatus = "SCHEDULED" | "IN_PROGRESS" | "DONE";
export type DemoTimelineKind = "INSTALL" | "MAINTENANCE" | "VISIT" | "DOCUMENT" | "NOTE";

export type DemoServiceEvent = { at: string; kind: DemoTimelineKind; label: string };

export type DemoService = {
  id: string;
  customer: string;
  equipment: string;
  operator: string;
  type: DemoOrderType;
  date: string;
  status: DemoServiceStatus;
  documents: string[];
  history: DemoServiceEvent[];
};

export * from "./documents";
