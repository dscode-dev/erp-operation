import { Injectable } from '@nestjs/common';
import { AssetLifecycleEventType } from '@prisma/client';
import type { AssetLifecycleEventPayload } from './asset-lifecycle.types';

type TimelineVisual = {
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  category: string;
};

const VISUALS: Record<AssetLifecycleEventType, TimelineVisual> = {
  INSTALLATION: {
    icon: 'wrench',
    color: '#2563EB',
    title: 'Instalação registrada',
    subtitle: 'Início do ciclo de vida do equipamento',
    category: 'installation',
  },
  INSPECTION: {
    icon: 'search-check',
    color: '#0EA5E9',
    title: 'Inspeção realizada',
    subtitle: 'Verificação técnica do ativo',
    category: 'inspection',
  },
  PREVENTIVE: {
    icon: 'shield-check',
    color: '#16A34A',
    title: 'Manutenção preventiva',
    subtitle: 'Intervenção planejada/preventiva',
    category: 'maintenance',
  },
  CORRECTIVE: {
    icon: 'triangle-alert',
    color: '#DC2626',
    title: 'Manutenção corretiva',
    subtitle: 'Correção de falha ou anomalia',
    category: 'maintenance',
  },
  MAINTENANCE: {
    icon: 'settings',
    color: '#7C3AED',
    title: 'Manutenção registrada',
    subtitle: 'Evento técnico de manutenção',
    category: 'maintenance',
  },
  ASSIGNMENT_CREATED: {
    icon: 'user-plus',
    color: '#2563EB',
    title: 'Atendimento atribuído',
    subtitle: 'Responsável operacional definido',
    category: 'assignment',
  },
  ASSIGNMENT_REASSIGNED: {
    icon: 'repeat-2',
    color: '#F59E0B',
    title: 'Atendimento reatribuído',
    subtitle: 'Responsável operacional alterado',
    category: 'assignment',
  },
  ASSIGNMENT_ACCEPTED: {
    icon: 'check-circle',
    color: '#16A34A',
    title: 'Atendimento aceito',
    subtitle: 'Operador confirmou a execução',
    category: 'assignment',
  },
  ASSIGNMENT_STARTED: {
    icon: 'play-circle',
    color: '#0EA5E9',
    title: 'Atendimento iniciado',
    subtitle: 'Execução em campo iniciada',
    category: 'assignment',
  },
  ASSIGNMENT_COMPLETED: {
    icon: 'badge-check',
    color: '#16A34A',
    title: 'Atendimento concluído',
    subtitle: 'Execução operacional finalizada',
    category: 'assignment',
  },
  PMOC_CREATED: {
    icon: 'clipboard-check',
    color: '#0F766E',
    title: 'PMOC criado',
    subtitle: 'Plano PMOC vinculado ao ativo',
    category: 'pmoc',
  },
  PMOC_UPDATED: {
    icon: 'clipboard-edit',
    color: '#0891B2',
    title: 'PMOC atualizado',
    subtitle: 'Dados de conformidade PMOC alterados',
    category: 'pmoc',
  },
  PMOC_COMPLETED: {
    icon: 'clipboard-check',
    color: '#16A34A',
    title: 'PMOC executado',
    subtitle: 'Execução planejada do PMOC concluída',
    category: 'pmoc',
  },
  PMOC_EXPIRED: {
    icon: 'clipboard-x',
    color: '#DC2626',
    title: 'PMOC vencido',
    subtitle: 'Validade do PMOC expirada',
    category: 'pmoc',
  },
  PART_REPLACEMENT: {
    icon: 'package-check',
    color: '#EA580C',
    title: 'Substituição de peça',
    subtitle: 'Componente substituído no ativo',
    category: 'parts',
  },
  WARRANTY: {
    icon: 'badge-check',
    color: '#0891B2',
    title: 'Evento de garantia',
    subtitle: 'Registro relacionado à garantia',
    category: 'warranty',
  },
  DOCUMENT: {
    icon: 'file-text',
    color: '#4F46E5',
    title: 'Documento gerado',
    subtitle: 'Documento oficial renderizado',
    category: 'document',
  },
  NOTE: {
    icon: 'sticky-note',
    color: '#64748B',
    title: 'Observação',
    subtitle: 'Nota registrada no equipamento',
    category: 'note',
  },
  CUSTOM: {
    icon: 'sparkles',
    color: '#9333EA',
    title: 'Evento personalizado',
    subtitle: 'Registro especial do ativo',
    category: 'custom',
  },
};

@Injectable()
export class TimelineAssembler {
  assemble(event: AssetLifecycleEventPayload): Record<string, unknown> {
    const visual = VISUALS[event.type];
    const operationTitle = event.operation
      ? `Atendimento #${event.operation.number} · ${event.operation.type}`
      : null;
    const documentTitle = event.document
      ? `${event.document.number} · ${event.document.type}`
      : null;
    const title =
      event.type === AssetLifecycleEventType.DOCUMENT && documentTitle
        ? `Documento ${documentTitle}`
        : (operationTitle ?? visual.title);

    return {
      id: event.id,
      icon: visual.icon,
      color: visual.color,
      title,
      subtitle: visual.subtitle,
      category: visual.category,
      description: event.description,
      date: event.occurredAt,
      groupKey: event.occurredAt.toISOString().slice(0, 10),
      sortKey: `${event.occurredAt.toISOString()}_${event.id}`,
      user: event.performer
        ? {
            id: event.performer.id,
            name: event.performer.name,
            username: event.performer.username,
          }
        : null,
      type: event.type,
      operationId: event.operationId,
      documentId: event.documentId,
      equipmentId: event.equipmentId,
      references: {
        equipment: event.equipment
          ? {
              id: event.equipment.id,
              name: event.equipment.name,
              tag: event.equipment.tag,
              type: event.equipment.type,
              status: event.equipment.status,
            }
          : null,
        customer: event.equipment?.customer
          ? {
              id: event.equipment.customer.id,
              name: event.equipment.customer.name,
              tradeName: event.equipment.customer.tradeName,
            }
          : null,
        operation: event.operation
          ? {
              id: event.operation.id,
              number: event.operation.number,
              type: event.operation.type,
              status: event.operation.status,
            }
          : null,
        document: event.document
          ? {
              id: event.document.id,
              number: event.document.number,
              type: event.document.type,
              status: event.document.status,
              renderedAt: event.document.renderedAt,
              fileSize: event.document.fileSize,
            }
          : null,
      },
      attachments: event.attachments.map((attachment) => ({
        id: attachment.id,
        category: attachment.category,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        originalFileName: attachment.originalFileName,
        createdAt: attachment.createdAt,
      })),
      badges: [visual.category, event.type.toLowerCase()],
    };
  }

  assembleGroups(events: AssetLifecycleEventPayload[]): Array<Record<string, unknown>> {
    const groups = new Map<string, AssetLifecycleEventPayload[]>();
    for (const event of events) {
      const key = event.occurredAt.toISOString().slice(0, 10);
      groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return [...groups.entries()].map(([date, items]) => ({
      date,
      count: items.length,
      items: items.map((item) => this.assemble(item)),
    }));
  }
}
