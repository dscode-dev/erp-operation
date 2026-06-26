/**
 * Service types and default checklists — operational configuration.
 *
 * Based on the pilot customer (Climatize Refrigeração — HVAC): projetos,
 * manutenção preventiva/corretiva e instalações. This is configuration, not
 * mock data; when the backend Service domain exists these may be served by it.
 */
export type ServiceTypeKey = "PREVENTIVA" | "CORRETIVA" | "INSTALACAO" | "PROJETO";

export type ServiceTypeConfig = {
  key: ServiceTypeKey;
  label: string;
  description: string;
  defaultChecklist: string[];
};

export const SERVICE_TYPES: ServiceTypeConfig[] = [
  {
    key: "PREVENTIVA",
    label: "Manutenção Preventiva",
    description: "Limpeza, inspeção e verificação periódica.",
    defaultChecklist: [
      "Conferir EPI e isolar a área",
      "Limpeza de filtros e serpentinas",
      "Medição de pressões e temperaturas",
      "Verificação elétrica e de drenagem",
      "Teste de funcionamento",
      "Coletar assinatura do cliente",
    ],
  },
  {
    key: "CORRETIVA",
    label: "Manutenção Corretiva",
    description: "Diagnóstico e reparo de falha.",
    defaultChecklist: [
      "Conferir EPI e isolar a área",
      "Diagnóstico da falha",
      "Execução do reparo",
      "Teste de estanqueidade / carga",
      "Teste de funcionamento",
      "Coletar assinatura do cliente",
    ],
  },
  {
    key: "INSTALACAO",
    label: "Instalação",
    description: "Instalação de novo equipamento.",
    defaultChecklist: [
      "Conferir EPI e materiais",
      "Fixação e nivelamento",
      "Tubulação e elétrica",
      "Vácuo e carga de gás",
      "Teste de funcionamento",
      "Coletar assinatura do cliente",
    ],
  },
  {
    key: "PROJETO",
    label: "Projeto / Visita Técnica",
    description: "Levantamento técnico em campo.",
    defaultChecklist: [
      "Levantamento das condições do local",
      "Medições e fotos",
      "Anotações técnicas",
      "Coletar assinatura do cliente",
    ],
  },
];

export function serviceTypeLabel(key: ServiceTypeKey): string {
  return SERVICE_TYPES.find((t) => t.key === key)?.label ?? key;
}
