/**
 * Service types — classificação operacional do atendimento (OperationType).
 *
 * Apenas rótulos/descrições dos tipos de serviço. Os checks de atendimento NÃO
 * ficam aqui: vêm de Catálogos Técnicos (type CHECKLIST) por workflow do
 * documento, carregados em tempo real (ver `technicalCatalogsApi.listChecklistItems`).
 */
export type ServiceTypeKey = "PREVENTIVA" | "CORRETIVA" | "INSTALACAO" | "PROJETO";

export type ServiceTypeConfig = {
  key: ServiceTypeKey;
  label: string;
  description: string;
};

export const SERVICE_TYPES: ServiceTypeConfig[] = [
  {
    key: "PREVENTIVA",
    label: "Manutenção Preventiva",
    description: "Limpeza, inspeção e verificação periódica.",
  },
  {
    key: "CORRETIVA",
    label: "Manutenção Corretiva",
    description: "Diagnóstico e reparo de falha.",
  },
  {
    key: "INSTALACAO",
    label: "Instalação",
    description: "Instalação de novo equipamento.",
  },
  {
    key: "PROJETO",
    label: "Projeto / Visita Técnica",
    description: "Levantamento técnico em campo.",
  },
];

export function serviceTypeLabel(key: ServiceTypeKey): string {
  return SERVICE_TYPES.find((t) => t.key === key)?.label ?? key;
}
