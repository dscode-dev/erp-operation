import { Prisma } from '@prisma/client';

export interface AssetLifecycleAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

export const ASSET_LIFECYCLE_EVENT_INCLUDE = {
  equipment: {
    select: {
      id: true,
      name: true,
      tag: true,
      type: true,
      status: true,
      customerId: true,
      customer: { select: { id: true, name: true, tradeName: true } },
    },
  },
  operation: { select: { id: true, number: true, type: true, status: true } },
  document: {
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      renderedAt: true,
      fileSize: true,
    },
  },
  performer: { select: { id: true, name: true, email: true, username: true } },
  attachments: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.AssetLifecycleEventInclude;

export type AssetLifecycleEventPayload = Prisma.AssetLifecycleEventGetPayload<{
  include: typeof ASSET_LIFECYCLE_EVENT_INCLUDE;
}>;
