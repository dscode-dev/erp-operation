/**
 * Shared API types — single source of truth for backend contracts.
 *
 * Mirrors docs/backend/API_CONTRACTS.md, FRONTEND_INTEGRATION.md and OPUS_INTEGRATION.md.
 * Sprint 11 frontend: Financial and Procurement consume production APIs.
 * Dashboard / Schedule still keep narrow development bridges where backend domains are pending.
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

export type Role = 'OWNER' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type LoginPayload = { email: string; password: string };

/* ============ Users / Team ============ */

export type UserTheme = 'SYSTEM' | 'LIGHT' | 'DARK';

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
export type CompleteFirstAccessPayload = ChangePasswordPayload & {
  signatureTitle: string;
  profession?: string;
  professionalCouncil?: string;
  registrationNumber?: string;
  department?: string;
};

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
  mimeType: string;
  originalFileName: string;
  fileSize: number;
  createdAt: string;
};

/* ============ Notifications ============ */

export type NotificationType =
  | 'ASSIGNMENT_ASSIGNED'
  | 'ASSIGNMENT_REASSIGNED'
  | 'ASSIGNMENT_REJECTED'
  | 'ASSIGNMENT_OVERDUE'
  | 'OPERATION_STARTED'
  | 'OPERATION_COMPLETED'
  | 'BUDGET_APPROVED'
  | 'BUDGET_REJECTED';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
export type NotificationEntityType = 'ASSIGNMENT' | 'OPERATION' | 'BUDGET' | 'MAINTENANCE' | 'PMOC';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

/* ============ Organization ============ */

export type BrandAssetType = 'LOGO' | 'HEADER' | 'FOOTER';

export type DocumentTemplateType =
  | 'BUDGET'
  | 'QUOTE'
  | 'WORK_ORDER'
  | 'RECEIPT'
  | 'REPORT'
  | 'TECHNICAL_REPORT'
  | 'TECHNICAL_OPINION'
  | 'PMOC';

export type SignatureMode = 'NONE' | 'FIXED' | 'COLLECTED' | 'HYBRID';

export type Organization = {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string | null;
  email: string;
  phone: string;
  phoneNumbers: string[];
  website: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
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
  institutionalSignatures?: Array<{ signatureId: string; position: number }>;
  executionSignatureClient: boolean;
  executionSignatureTechnician: boolean;
  executionSignatureOperator: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Signature = {
  id: string;
  userId: string | null;
  name: string;
  title: string;
  profession: string | null;
  professionalCouncil: string | null;
  registrationNumber: string | null;
  department: string | null;
  hasImage: boolean;
  user?: { id: string; name: string; role: Role; jobTitle: string | null } | null;
  mimeType: string | null;
  originalFileName: string | null;
  fileSize: number | null;
  active: boolean;
  isDefault: boolean;
  position: number;
  deletedAt: string | null;
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
    | 'id'
    | 'legalName'
    | 'tradeName'
    | 'cnpj'
    | 'email'
    | 'phone'
    | 'city'
    | 'state'
    | 'primaryColor'
    | 'secondaryColor'
  >;
  settings: Pick<
    OrganizationSettings,
    'id' | 'language' | 'timezone' | 'currency' | 'documentPrefix'
  >;
  defaultTemplate:
    | (DocumentTemplate & {
        signature?: Signature | null;
        institutionalSignatures?: Array<{ position: number; signature: Signature }>;
      })
    | null;
  templates: Array<
    DocumentTemplate & {
      signature?: Signature | null;
      institutionalSignatures?: Array<{ position: number; signature: Signature }>;
    }
  >;
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
  stateRegistration: string;
  email: string;
  phone: string;
  phoneNumbers: string[];
  website: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
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
  institutionalSignatureIds?: string[];
  executionSignatureClient?: boolean;
  executionSignatureTechnician?: boolean;
  executionSignatureOperator?: boolean;
};

export type UpdateDocumentTemplatePayload = Partial<CreateDocumentTemplatePayload>;

/* ============ Customers ============ */

export type CustomerType = 'PERSON' | 'COMPANY';

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
  | 'SPLIT'
  | 'CHILLER'
  | 'CONDENSER'
  | 'EVAPORATOR'
  | 'AIR_HANDLER'
  | 'SOLAR_INVERTER'
  | 'ELECTRICAL_PANEL'
  | 'GENERATOR'
  | 'OTHER';

export type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'RETIRED';

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
  capacity: string | null;
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
  | 'INSTALLATION'
  | 'INSPECTION'
  | 'PREVENTIVE'
  | 'CORRECTIVE'
  | 'MAINTENANCE'
  | 'ASSIGNMENT_CREATED'
  | 'ASSIGNMENT_REASSIGNED'
  | 'ASSIGNMENT_ACCEPTED'
  | 'ASSIGNMENT_STARTED'
  | 'ASSIGNMENT_COMPLETED'
  | 'BUDGET_APPROVED'
  | 'BUDGET_REJECTED'
  | 'DOCUMENT_RENDERED'
  | 'PMOC_CREATED'
  | 'PMOC_UPDATED'
  | 'PMOC_COMPLETED'
  | 'PMOC_EXPIRED'
  | 'PART_REPLACEMENT'
  | 'WARRANTY'
  | 'DOCUMENT'
  | 'NOTE'
  | 'CUSTOM';

export type AssetLifecycleAttachment = {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
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
    equipment: {
      id: string;
      name: string;
      tag: string | null;
      type: string;
      status: string;
    } | null;
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
  createdAt: string;
  equipment?: {
    id: string;
    name: string;
    tag: string | null;
    type: string;
    status: string;
    customer?: { id: string; name: string; tradeName: string | null } | null;
  } | null;
  operation?: { id: string; number: number; type: string; status: string } | null;
  document?: {
    id: string;
    number: string;
    type: DocumentTemplateType;
    status: OperationDocumentStatus;
    renderedAt?: string | null;
    fileSize?: number | null;
  } | null;
  performer?: { id: string; name: string; username: string } | null;
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

export type OperationType = 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'PROJETO';
export type OperationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'COMPLETED'
  | 'CANCELED';
export type OperationMaintenanceType =
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'CORRECTIVE';
export type OperationDocumentStatus = 'DRAFT' | 'READY' | 'VALIDATED' | 'SENT';
export type DocumentEditorialStatus = 'DRAFT' | 'PENDING' | 'READY' | 'STALE';
export type DocumentWorkflowStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'STALE';
export type DocumentHandoffOrigin = 'OPERATOR' | 'PLATFORM' | 'SYSTEM';

export type DocumentHandoff = {
  id: string;
  operationId: string | null;
  number: string;
  type: DocumentTemplateType;
  artifactStatus: OperationDocumentStatus;
  editorialStatus: DocumentEditorialStatus;
  workflowStatus: DocumentWorkflowStatus;
  assignmentOrigin: 'MANAGEMENT' | 'OPERATOR';
  origin: DocumentHandoffOrigin;
  submittedAt: string | null;
  reviewStartedAt: string | null;
  finalizedAt: string | null;
  renderedAt: string | null;
  revision: number;
  validationIssues: string[];
  customerSignatureRequired?: boolean;
  technicalSignatureRequired?: boolean;
  customerSignature: null | {
    name: string;
    role: string | null;
    collectedAt: string;
    timezone: string;
    origin: DocumentHandoffOrigin;
    available: true;
    collectedBy: { id: string; name: string; role: Role } | null;
  };
  technicalSignature: null | Pick<
    Signature,
    | 'id'
    | 'name'
    | 'title'
    | 'profession'
    | 'professionalCouncil'
    | 'registrationNumber'
    | 'department'
    | 'active'
    | 'hasImage'
  >;
  collectedBy: { id: string; name: string; role: Role } | null;
  reviewedBy: { id: string; name: string; role: Role } | null;
  finalizedBy: { id: string; name: string; role: Role } | null;
  operation: null | {
    id: string;
    number: number;
    status: OperationStatus;
    customer: { id: string; name: string; tradeName: string | null };
    operator: { id: string; name: string };
    equipment: { id: string; name: string; tag: string } | null;
    equipmentCount: number;
    evidenceCount: number;
  };
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentRevision = {
  id: string;
  revision: number;
  action: string;
  origin: DocumentHandoffOrigin;
  changedFields: string[];
  createdAt: string;
  actor: { id: string; name: string; role: Role };
};

export type OperationChecklistItem = { label: string; done: boolean; note?: string | null };
export type OperationMaintenanceChecklistItem = {
  id?: string;
  equipmentId?: string | null;
  maintenanceType: OperationMaintenanceType;
  description: string;
  executed: boolean;
  result?: 'YES' | 'NO' | 'NOT_APPLICABLE';
  observations?: string | null;
  position?: number;
  equipment?: { id: string; name: string; tag: string | null } | null;
};
export type OperationInspectedEquipment = {
  id?: string;
  equipmentId: string;
  sector: string;
  position?: number;
  brandSnapshot?: string | null;
  modelSnapshot?: string | null;
  capacitySnapshot?: string | null;
  tagSnapshot?: string | null;
  serialSnapshot?: string | null;
  systemTypeSnapshot?: string | null;
  currentSituationSnapshot?: string | null;
  equipment?: { id: string; name: string; type: EquipmentType };
};

export type MaintenanceChecklistTemplate = {
  id: string;
  organizationId: string;
  maintenanceType: OperationMaintenanceType;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TechnicalCatalogType =
  | 'CHECKLIST'
  | 'OBJECTIVE'
  | 'SITE_CONDITION'
  | 'CONCLUSION'
  | 'RECOMMENDATION'
  | 'PLAN_SCOPE';

export type TechnicalCatalogArea =
  | 'GENERAL'
  | 'HVAC'
  | 'ELECTRICAL'
  | 'REFRIGERATION'
  | 'MECHANICAL'
  | 'HYDRAULIC'
  | 'SAFETY';

export type TechnicalCatalogWorkflow =
  | 'GENERAL'
  | 'WORK_ORDER'
  | 'TECHNICAL_REPORT'
  | 'TECHNICAL_OPINION'
  | 'PMOC'
  | 'MAINTENANCE';

export type TechnicalCatalog = {
  id: string;
  organizationId: string;
  type: TechnicalCatalogType;
  title: string;
  description: string | null;
  tags: string[];
  areas: TechnicalCatalogArea[];
  workflows: TechnicalCatalogWorkflow[];
  maintenanceType: OperationMaintenanceType | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TechnicalCatalogTypeDescriptor = {
  value: TechnicalCatalogType;
  label: string;
};

export type TechnicalCatalogTaxonomy = {
  areas: Array<{ value: TechnicalCatalogArea; label: string }>;
  workflows: Array<{ value: TechnicalCatalogWorkflow; label: string }>;
};

export type OperationDocument = {
  id: string;
  operationId?: string | null;
  budgetId?: string | null;
  type: DocumentTemplateType;
  number: string;
  status: OperationDocumentStatus;
  editorialStatus?: DocumentEditorialStatus;
  revision?: number;
  technicalSignatureId?: string | null;
  customerSignatureSnapshot?: Record<string, unknown> | null;
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
  createdBy: { id: string; name: string; role: Role } | null;
};

export type OperationSummary = {
  id: string;
  number: number;
  type: OperationType;
  requestedDocumentType: DocumentTemplateType;
  serviceTypes: OperationType[];
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

export type OperationDetail = Omit<OperationSummary, 'equipment'> & {
  sourceSale?: Pick<
    Sale,
    | 'id'
    | 'number'
    | 'status'
    | 'soldAt'
    | 'warrantyDays'
    | 'warrantyStartsAt'
    | 'warrantyEndsAt'
    | 'total'
  > | null;
  assignment?: {
    id: string;
    assignedBy: string;
    assignedTo: string;
    status: AssignmentStatus;
  } | null;
  address: CustomerAddress | null;
  equipment: { id: string; name: string; tag: string | null; type: EquipmentType } | null;
  checklist: OperationChecklistItem[];
  observations: string | null;
  reportedIssue: string | null;
  serviceDescription: string | null;
  receiptNumber: string | null;
  receiptIssuedAt: string | null;
  receiptAmount: string | number | null;
  receiptAmountInWords: string | null;
  receiptService: string | null;
  receiptDescription: string | null;
  receiptWarrantyDays: number | null;
  receiptDeclaration: string | null;
  technicalDiagnosis: string | null;
  technicalRecommendations: string | null;
  technicalOpinionObjective: string | null;
  technicalOpinionObjectiveItems: string[];
  technicalOpinionConditions: string | null;
  technicalOpinionAnalysis: string | null;
  technicalOpinionConclusion: string | null;
  technicalOpinionConclusionItems: string[];
  technicalOpinionRecommendations: string | null;
  technicalOpinionResponsible: string | null;
  technicalOpinionCrea: string | null;
  referenceMonth: number | null;
  referenceYear: number | null;
  maintenanceType: OperationMaintenanceType | null;
  maintenanceChecklistItems: OperationMaintenanceChecklistItem[];
  inspectedEquipments: OperationInspectedEquipment[];
  signatureData?: never;
  signatureCaptured?: boolean;
  customerSignerName: string | null;
  customerSignerRole: string | null;
  signedAt: string | null;
  photos: OperationPhoto[];
  documents: OperationDocument[];
  maintenanceExecution?:
    | (MaintenanceExecution & {
        pmocExecutionRequest?: Pick<
          PmocExecutionRequest,
          'id' | 'executionNumber' | 'executionYear' | 'status' | 'origin'
        > | null;
        plan: MaintenancePlan & {
          pmocPlan?: {
            id: string;
            number: number;
            periodicity: PmocPeriodicity;
            generationMode: PmocGenerationMode;
            responsibleTechnician: string;
            contractNumber: string | null;
            artNumber: string | null;
            equipments: Array<{
              equipment: Pick<EquipmentSummary, 'id' | 'name' | 'tag'>;
            }>;
          } | null;
        };
      })
    | null;
};

export type OperationStats = {
  total: number;
  byStatus: Record<OperationStatus, number>;
};

export type OperatorExecutionPeriod = {
  month: string;
  timezone: string;
  from: string;
  to: string;
};

export type OperatorExecutionMetrics = {
  operatorId: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  canceled: number;
  completionRate: number;
  averageDurationMinutes: number | null;
  lastCompletedAt: string | null;
};

export type OperatorExecutionKpis = {
  operators: number;
  activeOperators: number;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  averageDurationMinutes: number | null;
};

export type OperatorExecutionUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  jobTitle: string | null;
  isActive: boolean;
  disabledAt: string | null;
  avatarAssetId: string | null;
};

export type OperatorExecutionRow = OperatorExecutionUser & { metrics: OperatorExecutionMetrics };

export type OperatorExecutionsOverview = Paginated<OperatorExecutionRow> & {
  period: OperatorExecutionPeriod;
  kpis: OperatorExecutionKpis;
};

export type OperatorExecutionDetail = {
  operator: OperatorExecutionUser;
  period: OperatorExecutionPeriod;
  metrics: OperatorExecutionMetrics;
};

export type OperatorExecutionOperation = {
  id: string;
  number: number;
  type: OperationType;
  requestedDocumentType: DocumentTemplateType;
  status: OperationStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; tradeName: string | null };
  equipment: { id: string; name: string; tag: string | null } | null;
  assignment: {
    id: string;
    status: AssignmentStatus;
    assignedAt: string;
    acceptedAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
  } | null;
};

export type OperatorExecutionOperations = Paginated<OperatorExecutionOperation> & {
  period: OperatorExecutionPeriod;
  view: 'HISTORY' | 'AGENDA';
};

export type CreateOperationPayload = {
  customerId: string;
  sourceSaleId?: string | null;
  addressId?: string | null;
  equipmentId?: string | null;
  /** Delegates the resulting Operation/Assignment when allowed by backend RBAC. */
  operatorId?: string | null;
  /** Documento operacional solicitado para este atendimento. */
  documentType?: DocumentTemplateType;
  type: OperationType;
  serviceTypes?: OperationType[];
  status?: OperationStatus;
  scheduledFor?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  checklist?: OperationChecklistItem[];
  observations?: string | null;
  reportedIssue?: string | null;
  serviceDescription?: string | null;
  receiptNumber?: string | null;
  receiptIssuedAt?: string | null;
  receiptAmount?: number | null;
  receiptAmountInWords?: string | null;
  receiptService?: string | null;
  receiptDescription?: string | null;
  receiptWarrantyDays?: number | null;
  receiptDeclaration?: string | null;
  technicalDiagnosis?: string | null;
  technicalRecommendations?: string | null;
  technicalOpinionObjective?: string | null;
  technicalOpinionObjectiveItems?: string[];
  technicalOpinionConditions?: string | null;
  technicalOpinionAnalysis?: string | null;
  technicalOpinionConclusion?: string | null;
  technicalOpinionConclusionItems?: string[];
  technicalOpinionRecommendations?: string | null;
  technicalOpinionResponsible?: string | null;
  technicalOpinionCrea?: string | null;
  referenceMonth?: number | null;
  referenceYear?: number | null;
  maintenanceType?: OperationMaintenanceType | null;
  maintenanceChecklist?: OperationMaintenanceChecklistItem[];
  inspectedEquipments?: Array<{
    equipmentId: string;
    sector: string;
    systemType?: string | null;
    currentSituation?: string | null;
  }>;
  signatureData?: string | null;
  customerSignerName?: string | null;
  customerSignerRole?: string | null;
  signedAt?: string | null;
  photos?: { dataUrl: string; caption?: string | null }[];
};

/* ============ Assignments (operator workflow) ============ */

export type AssignmentStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'STARTED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELED'
  | 'REJECTED';

export type AssignmentEventType =
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'ACCEPTED'
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELED';

export type AssignmentUser = Pick<TeamUser, 'id' | 'name' | 'username' | 'role'>;

export type AssignmentOperation = Omit<OperationDetail, 'photos'> & {
  photos?: OperationPhoto[];
};

export type Assignment = {
  id: string;
  operationId: string;
  assignedBy: string;
  assignedTo: string;
  status: AssignmentStatus;
  assignedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assigner: AssignmentUser;
  assignee: AssignmentUser;
  operation: AssignmentOperation;
};

export type AssignmentHistoryItem = {
  id: string;
  assignmentId: string;
  operationId: string;
  event: AssignmentEventType;
  actorId: string;
  previousStatus: AssignmentStatus | null;
  newStatus: AssignmentStatus;
  notes: string | null;
  createdAt: string;
  actor: AssignmentUser;
};

export type CreateAssignmentPayload = {
  operationId: string;
  assignedTo: string;
  notes?: string | null;
};

/* ============ Maintenance Planning / PMOC ============ */

export type MaintenancePlanType = 'PREVENTIVE' | 'INSPECTION' | 'WARRANTY' | 'CUSTOM';
export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceExecutionStatus = 'PLANNED' | 'LINKED' | 'COMPLETED' | 'CANCELED';
export type PmocComplianceStatus =
  | 'COMPLIANT'
  | 'WARNING'
  | 'OVERDUE'
  | 'NON_COMPLIANT'
  | 'IN_PROGRESS';
export type PmocPeriodicity =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'FOUR_MONTHLY'
  | 'SEMIANNUAL'
  | 'YEARLY'
  | 'CUSTOM';
export type PmocGenerationMode = 'AUTO' | 'MANUAL' | 'PAUSED';
export type PmocOperationalStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'OVERDUE'
  | 'PAUSED'
  | 'ERROR'
  | 'EXPIRED';
export type PmocExecutionRequestStatus =
  | 'PENDING'
  | 'GENERATING_OS'
  | 'GENERATED'
  | 'FAILED'
  | 'CANCELLED';
export type PmocExecutionOrigin = 'AUTO' | 'MANUAL';
export type PmocSchedulerStatus =
  | 'NEVER_RUN'
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_FAILURE'
  | 'FAILED';

export type MaintenancePlan = {
  id: string;
  equipmentId: string;
  name: string;
  description: string | null;
  type: MaintenancePlanType;
  active: boolean;
  priority: MaintenancePriority;
  recurrenceRule: Record<string, unknown>;
  firstExecution: string;
  nextExecution: string | null;
  lastExecution: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  equipment?: Pick<EquipmentSummary, 'id' | 'name' | 'tag' | 'type' | 'status'> & {
    customer?: Pick<Customer, 'id' | 'name' | 'tradeName'> | null;
  };
};

export type MaintenanceExecution = {
  id: string;
  maintenancePlanId: string;
  operationId: string | null;
  scheduledAt: string;
  executedAt: string | null;
  status: MaintenanceExecutionStatus;
  notes: string | null;
  createdAt: string;
  plan?: MaintenancePlan;
  operation?: Pick<OperationSummary, 'id' | 'number' | 'type' | 'status'> | null;
};

export type MaintenanceStats = {
  activePlans: number;
  overduePlans: number;
  upcomingExecutions: number;
  completedExecutions: number;
  pendingExecutions: number;
  meanDaysBetweenExecutions: number | null;
};

export type PmocPlan = {
  id: string;
  number: number;
  organizationId: string;
  customerId: string;
  equipmentId: string;
  maintenancePlanId: string;
  coverage: string | null;
  periodicity: PmocPeriodicity;
  generationMode: PmocGenerationMode;
  defaultOperatorId: string | null;
  defaultTechnicianId: string | null;
  defaultAddressId: string | null;
  defaultOperationType: OperationType;
  serviceTypes: OperationType[];
  scopes?: Array<{
    technicalCatalogId: string;
    technicalCatalog: Pick<TechnicalCatalog, 'id' | 'type' | 'title' | 'description' | 'active'>;
  }>;
  defaultEstimatedDurationMinutes: number | null;
  defaultOperationObservations: string | null;
  signatureOverrideId: string | null;
  operationalStatus: PmocOperationalStatus;
  lastReservedExecutionNumber: number;
  lastGeneratedExecutionNumber: number;
  lastExecutionDate: string | null;
  nextExecutionDate: string | null;
  nextGenerationDate: string | null;
  lastSchedulerRun: string | null;
  lastSchedulerStatus: PmocSchedulerStatus;
  lastSchedulerError: string | null;
  lastSuccessfulGeneration: string | null;
  responsibleTechnician: string;
  artNumber: string | null;
  contractNumber: string | null;
  startDate: string;
  endDate: string;
  active: boolean;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<Customer, 'id' | 'name' | 'tradeName'>;
  equipment?: Pick<EquipmentSummary, 'id' | 'name' | 'tag' | 'type' | 'status'>;
  maintenancePlan?: MaintenancePlan & { executions?: MaintenanceExecution[] };
  defaultOperator?: Pick<TeamUser, 'id' | 'name' | 'username' | 'role'> | null;
  defaultTechnician?: Pick<TeamUser, 'id' | 'name' | 'username' | 'role'> | null;
  defaultAddress?: CustomerAddress | null;
  signatureOverride?: Pick<
    Signature,
    'id' | 'name' | 'title' | 'professionalCouncil' | 'department' | 'active'
  > | null;
  executionRequests?: PmocExecutionRequest[];
  equipments?: Array<{
    equipmentId: string;
    equipment: Pick<EquipmentSummary, 'id' | 'name' | 'tag' | 'type' | 'status'>;
  }>;
  compliance: {
    status: PmocComplianceStatus;
    evaluatedAt: string;
    reasons: string[];
    pendingExecutions: number;
    overdueExecutions: number;
  };
  overview?: PmocPlanOverview;
};

export type PmocPlanOverview = {
  expectedExecutions: number;
  completedExecutions: number;
  remainingExecutions: number;
  pendingExecutions: number;
  cancelledExecutions: number;
  failedExecutions: number;
  overdueExecutions: number;
  completionPercentage: number;
  averageDelayDays: number;
  lastExecutionDate: string | null;
  lastOperation: { id: string; number: number; status: OperationStatus } | null;
  lastDocument: {
    id: string;
    number: string;
    status: OperationDocumentStatus;
    renderedAt: string | null;
  } | null;
  health: {
    code: 'EXCELLENT' | 'GOOD' | 'ATTENTION' | 'CRITICAL';
    label: 'Excelente' | 'Boa' | 'Atenção' | 'Crítica';
    tone: 'success' | 'warning' | 'danger';
    score: number;
  };
};

export type PmocExecutionRequest = {
  id: string;
  pmocPlanId: string;
  maintenanceExecutionId: string | null;
  operationId: string | null;
  generatedOperationId: string | null;
  executionNumber: number;
  executionYear: number | null;
  status: PmocExecutionRequestStatus;
  origin: PmocExecutionOrigin;
  scheduledFor: string;
  requestedBy: string | null;
  plannedOperatorId: string | null;
  plannedTechnicianId: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  failureReason: string | null;
  generatedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  operation?:
    | (Pick<OperationSummary, 'id' | 'number' | 'type' | 'status'> & {
        scheduledFor?: string | null;
        signedAt?: string | null;
        _count?: { photos: number };
        operator?: Pick<TeamUser, 'id' | 'name' | 'username' | 'role'>;
        documents?: Array<{
          id: string;
          number: string;
          status: OperationDocumentStatus;
          renderedAt: string | null;
          fileSize: number | null;
          revision: number;
          renderMetadata: Record<string, unknown> | null;
        }>;
      })
    | null;
  maintenanceExecution?: Pick<
    MaintenanceExecution,
    'id' | 'scheduledAt' | 'status' | 'executedAt' | 'operationId'
  > | null;
  plannedOperator?: Pick<TeamUser, 'id' | 'name' | 'username' | 'role' | 'jobTitle'> | null;
  plannedTechnician?: Pick<TeamUser, 'id' | 'name' | 'username' | 'role' | 'jobTitle'> | null;
};

export type PmocHistoryItem = {
  id: string;
  pmocPlanId: string;
  executionRequestId: string | null;
  operationId: string | null;
  actorId: string | null;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
  source?: 'PMOC' | 'ASSIGNMENT' | 'DOCUMENT' | 'AUDIT';
  actor?: Pick<TeamUser, 'id' | 'name' | 'username' | 'role'> | null;
  document?: {
    id: string;
    number: string;
    status: OperationDocumentStatus;
    renderedAt: string | null;
  };
  execution?: {
    executionNumber: number;
    executionYear: number | null;
    workOrderNumber: number | null;
    status: PmocExecutionRequestStatus;
    scheduledFor: string;
    generatedAt: string | null;
    executedAt: string | null;
    operator: Pick<TeamUser, 'id' | 'name' | 'username' | 'role' | 'jobTitle'> | null;
    responsibleTechnician:
      | Pick<TeamUser, 'id' | 'name' | 'username' | 'role' | 'jobTitle'>
      | string
      | null;
  } | null;
};

export type PmocDashboardExecution = {
  id: string;
  pmocPlanId: string;
  pmocNumber: string;
  planName: string;
  customer: Pick<Customer, 'id' | 'name' | 'tradeName'>;
  equipments: Array<Pick<EquipmentSummary, 'id' | 'name' | 'tag'>>;
  executionNumber: number;
  origin: PmocExecutionOrigin;
  status: PmocExecutionRequestStatus;
  indicator: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  scheduledFor: string;
  generatedAt: string | null;
  executedAt: string | null;
  operator: Pick<TeamUser, 'id' | 'name'> | null;
  technician: Pick<TeamUser, 'id' | 'name'> | null;
  operation: { id: string; number: number; status: OperationStatus } | null;
  document: {
    id: string;
    number: string;
    status: OperationDocumentStatus;
    renderedAt: string | null;
  } | null;
};

export type PmocStats = {
  activePmocs: number;
  pausedPmocs: number;
  expiredPmocs: number;
  compliantPmocs: number;
  pendingPmocs: number;
  environments: number;
  monitoredEquipments: number;
  upcomingExecutions: number;
  executionsThisMonth: number;
  completedExecutions: number;
  pendingExecutions: number;
  cancelledExecutions: number;
  failedExecutions: number;
  calendar: { from: string; to: string; items: PmocDashboardExecution[] };
  upcoming: PmocDashboardExecution[];
  recent: PmocDashboardExecution[];
};

export type ReassignAssignmentPayload = {
  assignedTo: string;
  notes?: string | null;
};

/* ============ Inventory / Materials / Pricing ============ */

export type Product = {
  id: string;
  sku: string;
  internalCode: string | null;
  manufacturerCode: string | null;
  name: string;
  unit: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  technicalDescription: string | null;
  weight: string | number | null;
  dimensions: string | null;
  isPurchasable: boolean;
  isSellable: boolean;
  isActive: boolean;
  disabledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryItems?: InventoryItem[];
  suppliers?: ProductSupplier[];
};

export type ProductPayload = Partial<{
  sku: string;
  internalCode: string | null;
  manufacturerCode: string | null;
  name: string;
  unit: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  technicalDescription: string | null;
  weight: number | null;
  dimensions: string | null;
  primarySupplierId: string | null;
  isPurchasable: boolean;
  isSellable: boolean;
  isActive: boolean;
}>;

export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELED';
export type SaleItem = {
  id: string;
  productId: string | null;
  description: string;
  quantity: string | number;
  unit: string;
  snapshotUnitPrice: string | number;
  snapshotCost: string | number;
  total: string | number;
  product?: Product | null;
};
export type Sale = {
  id: string;
  number: number;
  status: SaleStatus;
  customerId: string;
  customerAddressId: string | null;
  soldAt: string;
  warrantyDays: number | null;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; tradeName: string | null };
  customerAddress: CustomerAddress | null;
  creator: { id: string; name: string; role: Role };
  items: SaleItem[];
  receiptOperations: Array<{
    id: string;
    number: number;
    status: OperationStatus;
    requestedDocumentType: DocumentTemplateType;
    createdAt: string;
  }>;
};
export type SalePayload = {
  customerId: string;
  customerAddressId?: string | null;
  soldAt: string;
  warrantyDays?: number;
  warrantyStartsAt?: string;
  discount?: number;
  notes?: string | null;
  items: Array<{ productId: string; quantity: number }>;
};
export type SaleReceiptPrefill = {
  saleId: string;
  receiptNumber: string;
  issuedAt: string;
  amount: string | number;
  service: string;
  description: string;
  warrantyDays: number | null;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  customer: { id: string; name: string; tradeName: string | null };
  address: CustomerAddress | null;
};

export type InventoryItem = {
  id: string;
  organizationId: string;
  productId: string;
  currentQuantity: string | number;
  minimumQuantity: string | number;
  idealQuantity: string | number;
  reservedQuantity: string | number;
  availableQuantity: string | number;
  location: string | null;
  isActive: boolean;
  disabledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  product?: Product;
  organization?: { id: string; legalName: string; tradeName: string };
};

export type InventoryUpdatePayload = Partial<{
  minimumQuantity: number;
  idealQuantity: number;
  reservedQuantity: number;
  location: string | null;
  isActive: boolean;
}>;

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'CONSUMPTION' | 'RETURN';

export type StockMovement = {
  id: string;
  inventoryItemId: string;
  quantity: string | number;
  type: StockMovementType;
  reason: string;
  operationId: string | null;
  userId: string;
  occurredAt: string;
  createdAt: string;
  inventoryItem?: InventoryItem;
  operation?: {
    id: string;
    number: number;
    equipmentId: string | null;
    customerId: string | null;
  } | null;
  user?: { id: string; name: string; email?: string };
};

export type StockMovementPayload = {
  inventoryItemId: string;
  quantity: number;
  type: StockMovementType;
  reason: string;
  operationId?: string | null;
  occurredAt?: string;
};

export type InventoryStats = {
  totalItems: number;
  activeProducts: number;
  minimumStockAlerts: number;
  productsWithoutStock: number;
  consumptionMovementsLast30Days: number;
  consumptionByPeriod: unknown;
  consumptionByEquipment: Array<{
    equipment?: { id: string; name: string } | null;
    quantity: string | number;
  }>;
  consumptionByCustomer: Array<{
    customer?: { id: string; name: string; tradeName?: string | null } | null;
    quantity: string | number;
  }>;
  productsMostUsed: Array<{
    product: Pick<Product, 'id' | 'name' | 'sku'>;
    quantity: string | number;
    occurrences: number;
  }>;
};

export type Supplier = {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  contacts: unknown[];
  address: Record<string, unknown>;
  notes: string | null;
  isActive: boolean;
  disabledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductSupplier = {
  id: string;
  productId: string;
  supplierId: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
};

export type SupplierPayload = Partial<{
  legalName: string;
  tradeName: string | null;
  document: string | null;
  contacts: unknown[];
  address: Record<string, unknown>;
  notes: string | null;
  isActive: boolean;
}>;

export type OperationPart = {
  id: string;
  operationId: string;
  productId: string;
  inventoryItemId: string;
  quantity: string | number;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  product: Product;
  inventoryItem: InventoryItem;
};

export type OperationMaterialPayload = {
  productId: string;
  inventoryItemId: string;
  quantity: number;
  notes?: string | null;
};

export type ProductPricing = {
  id: string;
  organizationId: string;
  productId: string;
  costPrice: string | number;
  replacementCost: string | number;
  averageCost: string | number;
  salePrice: string | number;
  minimumSalePrice: string | number;
  suggestedSalePrice: string | number;
  marginPercentage: string | number;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  product?: Product;
};

export type ResolvedProductPricing = {
  pricingId: string;
  organizationId: string;
  productId: string;
  costPrice: string;
  replacementCost: string;
  averageCost: string;
  salePrice: string;
  minimumSalePrice: string;
  suggestedSalePrice: string;
  marginPercentage: string;
  validFrom: string;
  validUntil: string | null;
  active: boolean;
  resolvedAt: string;
};

export type ProductPricingPayload = {
  costPrice: number;
  replacementCost: number;
  averageCost: number;
  salePrice: number;
  minimumSalePrice: number;
  suggestedSalePrice: number;
  marginPercentage?: number;
  validFrom: string;
  validUntil?: string | null;
  active?: boolean;
};

export type PricingStats = {
  productsWithoutPrice: number;
  expiredPrices: number;
  highestMargins: ProductPricing[];
  lowestMargins: ProductPricing[];
  averageCost: string | number;
  averageSalePrice: string | number;
  averageMarginPercentage: string | number;
  activePricings: number;
  evaluatedAt: string;
};

/* ============ Financial ============ */

export type FinancialAccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';
export type FinancialCategoryType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type FinancialEntryType = 'RECEIVABLE' | 'PAYABLE' | 'TRANSFER';
export type FinancialEntryStatus = 'PENDING' | 'PAID' | 'CANCELED' | 'OVERDUE';
export type FinancialEntryOrigin =
  | 'MANUAL'
  | 'BUDGET'
  | 'PURCHASE'
  | 'OPERATION'
  | 'PMOC'
  | 'OTHER';
export type FinancialHistoryAction = 'CREATED' | 'UPDATED' | 'PAID' | 'CANCELED' | 'RESTORED';

export type FinancialAccount = {
  id: string;
  organizationId: string;
  name: string;
  type: FinancialAccountType;
  description: string | null;
  openingBalance: string | number;
  currentBalance: string | number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinancialCategory = {
  id: string;
  organizationId: string;
  name: string;
  type: FinancialCategoryType;
  color: string | null;
  icon: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FinancialEntry = {
  id: string;
  organizationId: string;
  accountId: string;
  categoryId: string;
  type: FinancialEntryType;
  origin: FinancialEntryOrigin;
  originId: string | null;
  amount: string | number;
  dueDate: string;
  paidAt: string | null;
  description: string;
  notes: string | null;
  status: FinancialEntryStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  account?: Pick<FinancialAccount, 'id' | 'name' | 'type' | 'currentBalance'>;
  category?: Pick<FinancialCategory, 'id' | 'name' | 'type' | 'color' | 'icon'>;
  creator?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
};

export type FinancialHistory = {
  id: string;
  financialEntryId: string;
  actorId: string;
  action: FinancialHistoryAction;
  previousStatus: FinancialEntryStatus | null;
  newStatus: FinancialEntryStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
};

export type FinancialStats = {
  receivableToday: string | number;
  payableToday: string | number;
  overdue: { receivable: string | number; payable: string | number };
  projectedBalance: string | number;
  currentBalance: string | number;
  income: string | number;
  expenses: string | number;
  monthlyFlow: Array<{
    month: string;
    income: string | number;
    expenses: string | number;
    balance: string | number;
  }>;
};

export type FinancialAccountPayload = Partial<{
  name: string;
  type: FinancialAccountType;
  description: string | null;
  openingBalance: number;
  active: boolean;
}>;

export type FinancialCategoryPayload = Partial<{
  name: string;
  type: FinancialCategoryType;
  color: string | null;
  icon: string | null;
  active: boolean;
}>;

export type FinancialEntryPayload = Partial<{
  accountId: string;
  categoryId: string;
  type: FinancialEntryType;
  origin: FinancialEntryOrigin;
  originId: string | null;
  amount: number;
  dueDate: string;
  paidAt: string;
  description: string;
  notes: string | null;
  status: FinancialEntryStatus;
}>;

/* ============ Procurement / Purchasing ============ */

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELED';
export type PurchaseHistoryAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELED';

export type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: string | number;
  unit: string;
  snapshotCost: string | number;
  snapshotDescription: string;
  receivedQuantity: string | number;
  createdAt: string;
  updatedAt: string;
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'unit' | 'brand' | 'model'>;
};

export type PurchaseReceipt = {
  id: string;
  purchaseOrderId: string;
  receivedBy: string;
  receivedAt: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  receiver?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
};

export type PurchaseOrder = {
  id: string;
  organizationId: string;
  supplierId: string;
  number: number;
  status: PurchaseOrderStatus;
  notes: string | null;
  expectedDelivery: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  supplier?: Pick<Supplier, 'id' | 'legalName' | 'tradeName' | 'document'>;
  creator?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
  items: PurchaseOrderItem[];
  receipts: PurchaseReceipt[];
};

export type PurchaseHistory = {
  id: string;
  purchaseOrderId: string;
  actorId: string;
  action: PurchaseHistoryAction;
  previousStatus: PurchaseOrderStatus | null;
  newStatus: PurchaseOrderStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
};

export type PurchaseOrderStats = {
  total: number;
  draft: number;
  sent: number;
  partiallyReceived: number;
  received: number;
  canceled: number;
};

export type PurchaseOrderPayload = Partial<{
  supplierId: string;
  expectedDelivery: string | null;
  notes: string | null;
}>;

export type PurchaseOrderItemPayload = Partial<{
  productId: string;
  quantity: number;
  unit: string;
  snapshotCost: number;
  snapshotDescription: string;
}>;

export type PurchaseReceiptPayload = {
  receivedAt?: string;
  notes?: string | null;
  items: Array<{ itemId: string; quantity: number }>;
};

/* ============ Budget ============ */

export type BudgetStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELED';
export type BudgetItemType = 'SERVICE' | 'MATERIAL';
export type BudgetPaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD';

export type BudgetHistoryAction =
  | 'CREATED'
  | 'UPDATED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELED'
  | 'DOCUMENT_RENDERED'
  | 'ITEM_ADDED'
  | 'ITEM_UPDATED'
  | 'ITEM_REMOVED';

export type BudgetItem = {
  id: string;
  budgetId: string;
  productId: string | null;
  type: BudgetItemType;
  description: string;
  quantity: string | number;
  unit: string;
  unitPrice: string | number;
  sortOrder: number;
  snapshotCost: string | number;
  snapshotSalePrice: string | number;
  snapshotMargin: string | number;
  total: string | number;
  createdAt: string;
  product?: Product;
};

export type BudgetApproval = {
  id: string;
  budgetId: string;
  actorId: string;
  status: BudgetStatus;
  observation: string | null;
  createdAt: string;
  actor?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
};

export type Budget = {
  id: string;
  organizationId: string;
  operationId: string | null;
  customerId: string;
  customerAddressId: string | null;
  equipmentId: string | null;
  number: number;
  status: BudgetStatus;
  title: string;
  description: string | null;
  issuedAt: string;
  introduction: string;
  serviceSubtotal: string | number;
  materialSubtotal: string | number;
  subtotal: string | number;
  discount: string | number;
  additional: string | number;
  total: string | number;
  amountInWords: string;
  validityDays: number;
  paymentMethods: BudgetPaymentMethod[];
  commercialNotes: string | null;
  expirationDate: string;
  observations: string | null;
  createdBy: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<Customer, 'id' | 'name' | 'tradeName' | 'email' | 'phone'>;
  customerAddress?: CustomerAddress | null;
  equipment?: Pick<EquipmentSummary, 'id' | 'name' | 'tag' | 'type' | 'status'> | null;
  operation?: {
    id: string;
    number: number;
    type: OperationType;
    status: OperationStatus;
    equipmentId: string | null;
    customerId: string;
  };
  creator?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username' | 'role'>;
  document?: OperationDocument | null;
  items: BudgetItem[];
  approvals: BudgetApproval[];
};

export type BudgetHistory = {
  id: string;
  budgetId: string;
  actorId: string;
  action: BudgetHistoryAction;
  previousStatus: BudgetStatus | null;
  newStatus: BudgetStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor?: Pick<TeamUser, 'id' | 'name' | 'email' | 'username'>;
};

export type BudgetStats = {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  potentialRevenue: string | number;
  averageTicket: string | number;
};

export type BudgetItemPayload = {
  productId?: string | null;
  type: BudgetItemType;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  sortOrder?: number;
};

export type BudgetPayload = {
  operationId?: string | null;
  customerId: string;
  customerAddressId?: string | null;
  equipmentId?: string | null;
  title: string;
  description?: string | null;
  issuedAt?: string;
  introduction?: string;
  discount?: number;
  additional?: number;
  expirationDate?: string;
  validityDays?: number;
  amountInWords?: string;
  paymentMethods: BudgetPaymentMethod[];
  commercialNotes?: string | null;
  observations?: string | null;
  status?: Extract<BudgetStatus, 'DRAFT' | 'PENDING'>;
  items: BudgetItemPayload[];
};

export * from './documents';
