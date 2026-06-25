import type { Status } from "@/components/shared/status-pill";
import type { Metric } from "@/components/platform/metric-card";

/* ============ Plataforma ============ */

export const platformMetrics: Metric[] = [
  { label: "Serviços do dia", value: "47", delta: "+6", trend: "up", icon: "Briefcase" },
  { label: "Operadores ativos", value: "18", delta: "+2", trend: "up", icon: "Users" },
  { label: "Em andamento", value: "12", delta: "—", trend: "flat", icon: "Activity" },
  { label: "Pendências", value: "5", delta: "-3", trend: "down", icon: "AlertCircle" },
  { label: "Concluídos", value: "23", delta: "+9", trend: "up", icon: "CheckCircle2" },
  { label: "Críticos", value: "2", delta: "+1", trend: "up", icon: "AlertTriangle" },
];

export type ServiceRow = {
  id: string;
  code: string;
  title: string;
  client: string;
  operator: string;
  time: string;
  status: Status;
  priority?: "alta" | "média" | "baixa";
};

export const todayServices: ServiceRow[] = [
  { id: "s1", code: "OS-2381", title: "Manutenção preventiva — Refrigerador", client: "Restaurante Aurora", operator: "Ana S.", time: "08:30", status: "in_progress" },
  { id: "s2", code: "OS-2382", title: "Instalação de câmera IP", client: "Clínica VitaCare", operator: "Carlos L.", time: "09:15", status: "scheduled" },
  { id: "s3", code: "OS-2383", title: "Troca de compressor", client: "Mercado Central", operator: "Marina R.", time: "10:00", status: "in_progress", priority: "alta" },
  { id: "s4", code: "OS-2384", title: "Diagnóstico elétrico", client: "Edifício Solar", operator: "João P.", time: "11:30", status: "scheduled" },
  { id: "s5", code: "OS-2385", title: "Reparo emergencial", client: "Hotel Mirante", operator: "Renato O.", time: "12:00", status: "pending", priority: "alta" },
  { id: "s6", code: "OS-2386", title: "Vistoria mensal", client: "Indústria Beta", operator: "Sofia M.", time: "14:00", status: "done" },
  { id: "s7", code: "OS-2387", title: "Substituição de painel elétrico", client: "Edifício Solar", operator: "João P.", time: "15:00", status: "scheduled" },
  { id: "s8", code: "OS-2388", title: "Limpeza de evaporadora", client: "Clínica VitaCare", operator: "Ana S.", time: "16:30", status: "scheduled" },
];

export const recentActivity = [
  { id: 1, who: "Ana Souza", what: "concluiu atendimento #2381", when: "há 2 min" },
  { id: 2, who: "Carlos Lima", what: "abriu chamado #2382", when: "há 6 min" },
  { id: 3, who: "Marina Reis", what: "atualizou equipamento EQP-118", when: "há 14 min" },
  { id: 4, who: "João Pedro", what: "encerrou turno", when: "há 32 min" },
  { id: 5, who: "Sofia Mendes", what: "agendou serviço #2390", when: "há 41 min" },
];

export const agenda: { id: string; time: string; title: string; where: string; status: Status }[] = [
  { id: "a1", time: "08:00", title: "Briefing de turno", where: "Sala 2", status: "done" },
  { id: "a2", time: "10:30", title: "Visita técnica — Hospital Norte", where: "Av. Brasil, 1200", status: "in_progress" },
  { id: "a3", time: "14:00", title: "Treinamento NR-10", where: "Auditório", status: "scheduled" },
  { id: "a4", time: "16:30", title: "Inspeção de equipamentos", where: "Galpão 4", status: "scheduled" },
];

export const criticalEquipment: { id: string; name: string; location: string; status: Status }[] = [
  { id: "e1", name: "Chiller central 200TR", location: "Cobertura — Bloco A", status: "danger" },
  { id: "e2", name: "Gerador diesel 350kVA", location: "Subsolo 2", status: "warning" },
  { id: "e3", name: "Compressor de ar 50HP", location: "Galpão 1", status: "warning" },
  { id: "e4", name: "Câmara fria #3", location: "Cozinha industrial", status: "offline" },
];

export type Client = {
  id: string;
  name: string;
  segment: string;
  city: string;
  contact: string;
  openServices: number;
  equipments: number;
  status: Status;
};

export const clients: Client[] = [
  { id: "c1", name: "Restaurante Aurora",  segment: "Food service",  city: "São Paulo / SP",     contact: "Mariana Castro",   openServices: 2, equipments: 14, status: "in_progress" },
  { id: "c2", name: "Clínica VitaCare",     segment: "Saúde",         city: "Campinas / SP",      contact: "Dr. Renato Alves", openServices: 3, equipments: 22, status: "scheduled" },
  { id: "c3", name: "Mercado Central",      segment: "Varejo",        city: "Curitiba / PR",      contact: "Paulo Henrique",   openServices: 1, equipments: 36, status: "in_progress" },
  { id: "c4", name: "Edifício Solar",       segment: "Predial",       city: "Belo Horizonte / MG",contact: "Síndico Ferreira", openServices: 2, equipments: 9,  status: "scheduled" },
  { id: "c5", name: "Hotel Mirante",        segment: "Hotelaria",     city: "Rio de Janeiro / RJ",contact: "Beatriz Lima",     openServices: 1, equipments: 41, status: "pending" },
  { id: "c6", name: "Indústria Beta",       segment: "Industrial",    city: "Joinville / SC",     contact: "Eng. Marcos",      openServices: 0, equipments: 58, status: "done" },
  { id: "c7", name: "Hospital Norte",       segment: "Saúde",         city: "Porto Alegre / RS",  contact: "Coord. Helena",    openServices: 4, equipments: 73, status: "danger" },
  { id: "c8", name: "Centro Empresarial Lumière", segment: "Predial", city: "São Paulo / SP",     contact: "Adm. Rogério",     openServices: 1, equipments: 27, status: "scheduled" },
];

export type Equipment = {
  id: string;
  tag: string;
  name: string;
  client: string;
  location: string;
  lastService: string;
  nextService: string;
  status: Status;
};

export const equipments: Equipment[] = [
  { id: "eq1", tag: "EQP-118", name: "Chiller central 200TR",       client: "Hospital Norte",    location: "Cobertura — Bloco A",  lastService: "12/05/2026", nextService: "10/07/2026", status: "danger" },
  { id: "eq2", tag: "EQP-204", name: "Gerador diesel 350kVA",       client: "Centro Lumière",    location: "Subsolo 2",            lastService: "02/06/2026", nextService: "02/09/2026", status: "warning" },
  { id: "eq3", tag: "EQP-077", name: "Compressor de ar 50HP",       client: "Indústria Beta",    location: "Galpão 1",             lastService: "20/05/2026", nextService: "20/08/2026", status: "warning" },
  { id: "eq4", tag: "EQP-031", name: "Câmara fria #3",              client: "Restaurante Aurora",location: "Cozinha industrial",   lastService: "01/06/2026", nextService: "—",          status: "offline" },
  { id: "eq5", tag: "EQP-512", name: "Split inverter 24.000 BTU",   client: "Clínica VitaCare",  location: "Recepção",             lastService: "10/06/2026", nextService: "10/12/2026", status: "done" },
  { id: "eq6", tag: "EQP-389", name: "Refrigerador vertical 4 portas", client: "Mercado Central",location: "Açougue",              lastService: "18/06/2026", nextService: "18/09/2026", status: "in_progress" },
  { id: "eq7", tag: "EQP-145", name: "VRF 12HP",                    client: "Hotel Mirante",     location: "Andar técnico 12",     lastService: "30/04/2026", nextService: "30/07/2026", status: "scheduled" },
  { id: "eq8", tag: "EQP-621", name: "Bomba centrífuga 7,5cv",      client: "Edifício Solar",    location: "Casa de máquinas",     lastService: "22/05/2026", nextService: "22/08/2026", status: "done" },
];

export type AgendaEventKind = "atendimento" | "manutencao" | "visita" | "urgencia";

export type AgendaEvent = {
  id: string;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  time: string;
  endTime: string;
  title: string;
  client: string;
  operator: string;
  status: Status;
  kind: AgendaEventKind;
};

export const weekAgenda: AgendaEvent[] = [
  { id: "w1",  day: 1, time: "08:30", endTime: "10:00", title: "Manutenção preventiva", client: "Restaurante Aurora", operator: "Ana S.",   status: "in_progress", kind: "manutencao" },
  { id: "w2",  day: 1, time: "10:00", endTime: "12:00", title: "Troca de compressor",   client: "Mercado Central",    operator: "Marina R.",status: "in_progress", kind: "manutencao" },
  { id: "w3",  day: 1, time: "14:00", endTime: "15:30", title: "Vistoria mensal",       client: "Indústria Beta",     operator: "Sofia M.", status: "done",        kind: "atendimento" },
  { id: "w4",  day: 2, time: "09:00", endTime: "11:00", title: "Instalação câmera IP",  client: "Clínica VitaCare",   operator: "Carlos L.",status: "scheduled",   kind: "atendimento" },
  { id: "w5",  day: 2, time: "13:30", endTime: "16:00", title: "Treinamento NR-10",     client: "Interno",            operator: "Equipe",   status: "scheduled",   kind: "visita" },
  { id: "w6",  day: 3, time: "08:00", endTime: "10:30", title: "Diagnóstico elétrico",  client: "Edifício Solar",     operator: "João P.",  status: "scheduled",   kind: "atendimento" },
  { id: "w7",  day: 3, time: "15:00", endTime: "17:00", title: "Reparo emergencial",    client: "Hotel Mirante",      operator: "Renato O.",status: "pending",     kind: "urgencia" },
  { id: "w8",  day: 4, time: "10:30", endTime: "12:00", title: "Visita técnica",        client: "Hospital Norte",     operator: "Marina R.",status: "scheduled",   kind: "visita" },
  { id: "w9",  day: 5, time: "09:00", endTime: "10:00", title: "Limpeza evaporadora",   client: "Clínica VitaCare",   operator: "Ana S.",   status: "scheduled",   kind: "manutencao" },
  { id: "w10", day: 5, time: "14:00", endTime: "16:00", title: "Substituição painel",   client: "Edifício Solar",     operator: "João P.",  status: "scheduled",   kind: "atendimento" },
  { id: "w11", day: 6, time: "11:00", endTime: "12:00", title: "Inspeção câmara fria",  client: "Restaurante Aurora", operator: "Sofia M.", status: "scheduled",   kind: "manutencao" },
];

export const weekDays = [
  { d: 1, label: "Seg", date: "22/06" },
  { d: 2, label: "Ter", date: "23/06" },
  { d: 3, label: "Qua", date: "24/06" },
  { d: 4, label: "Qui", date: "25/06" },
  { d: 5, label: "Sex", date: "26/06" },
  { d: 6, label: "Sáb", date: "27/06" },
  { d: 7, label: "Dom", date: "28/06" },
] as const;

/* ============ Equipe / Alertas (dashboard) ============ */

export const teamOnline: { id: string; name: string; role: string; status: "online" | "em_servico" | "offline"; current?: string }[] = [
  { id: "t1", name: "Ana Souza",    role: "Refrigeração",   status: "em_servico", current: "OS-2381 · Aurora" },
  { id: "t2", name: "Marina Reis",  role: "Refrigeração",   status: "em_servico", current: "OS-2383 · Mercado Central" },
  { id: "t3", name: "Carlos Lima",  role: "Elétrica/CFTV",  status: "online" },
  { id: "t4", name: "João Pedro",   role: "Elétrica",       status: "em_servico", current: "OS-2384 · Edifício Solar" },
  { id: "t5", name: "Sofia Mendes", role: "Industrial",     status: "online" },
  { id: "t6", name: "Renato O.",    role: "Geradores",      status: "offline" },
];

export const operationalAlerts: { id: string; title: string; detail: string; severity: "danger" | "warning" | "info" }[] = [
  { id: "al1", title: "OS-2385 atrasada em 25min", detail: "Hotel Mirante · Renato O.", severity: "danger" },
  { id: "al2", title: "Chiller 200TR — alarme de baixa pressão", detail: "EQP-118 · Hospital Norte", severity: "danger" },
  { id: "al3", title: "Contrato vence em 12 dias", detail: "Indústria Beta · renovar SLA",        severity: "warning" },
  { id: "al4", title: "Estoque baixo — filtro secador", detail: "Restam 3 unidades",              severity: "warning" },
];

/* ============ Financeiro (mockado) ============ */

export const financialMetrics: Metric[] = [
  { label: "Receita do mês",    value: "R$ 184.220", delta: "+12%", trend: "up",   icon: "TrendingUp" },
  { label: "Despesas do mês",   value: "R$ 92.480",  delta: "+4%",  trend: "up",   icon: "TrendingDown" },
  { label: "Lucro estimado",    value: "R$ 91.740",  delta: "+18%", trend: "up",   icon: "Wallet" },
  { label: "Previsão fim mês",  value: "R$ 235.000", delta: "+8%",  trend: "up",   icon: "LineChart" },
];

export const financialMonthly: { month: string; receita: number; despesa: number }[] = [
  { month: "Jan", receita: 142000, despesa: 78000 },
  { month: "Fev", receita: 158000, despesa: 81000 },
  { month: "Mar", receita: 167000, despesa: 84000 },
  { month: "Abr", receita: 171000, despesa: 87000 },
  { month: "Mai", receita: 176000, despesa: 90000 },
  { month: "Jun", receita: 184220, despesa: 92480 },
];

export const financialReceivables: { id: string; client: string; due: string; amount: string; status: Status }[] = [
  { id: "r1", client: "Hospital Norte",        due: "Hoje",       amount: "R$ 18.400", status: "pending" },
  { id: "r2", client: "Indústria Beta",        due: "Em 3 dias",  amount: "R$ 24.900", status: "scheduled" },
  { id: "r3", client: "Centro Lumière",        due: "Em 7 dias",  amount: "R$ 12.300", status: "scheduled" },
  { id: "r4", client: "Restaurante Aurora",    due: "Atrasado",   amount: "R$ 3.800",  status: "danger" },
];

export const financialExpenses: { id: string; label: string; category: string; amount: string }[] = [
  { id: "e1", label: "Folha de pagamento",  category: "Pessoal",        amount: "R$ 48.200" },
  { id: "e2", label: "Combustível frota",   category: "Operacional",    amount: "R$ 11.400" },
  { id: "e3", label: "Peças e insumos",     category: "Estoque",        amount: "R$ 18.700" },
  { id: "e4", label: "Aluguel / utilities", category: "Estrutural",     amount: "R$ 9.600"  },
  { id: "e5", label: "Softwares e taxas",   category: "Administrativo", amount: "R$ 4.580"  },
];

/* ============ Operador ============ */

export const operatorNext = {
  id: "n1",
  title: "Manutenção preventiva — Refrigerador",
  client: "Restaurante Aurora",
  time: "Hoje · 14:30",
};

export const operatorOngoing: { id: string; title: string; client: string; time: string; status: Status; priority?: "alta" | "média" | "baixa" }[] = [
  { id: "o1", title: "Troca de compressor", client: "Mercado Central", time: "iniciado 10:00", status: "in_progress", priority: "alta" },
  { id: "o2", title: "Diagnóstico elétrico", client: "Edifício Solar", time: "iniciado 11:30", status: "in_progress" },
];

export const operatorSchedule: { id: string; title: string; client: string; time: string; where: string; status: Status; priority?: "alta" | "média" | "baixa" }[] = [
  { id: "p1", title: "Instalação de câmera IP", client: "Clínica VitaCare", time: "15:00", where: "R. das Acácias, 320", status: "scheduled" },
  { id: "p2", title: "Reparo emergencial", client: "Hotel Mirante", time: "16:30", where: "Av. Atlântica, 1500", status: "scheduled", priority: "alta" },
  { id: "p3", title: "Vistoria mensal", client: "Indústria Beta", time: "18:00", where: "Distrito Industrial", status: "scheduled" },
];

export const operatorDocuments: { id: string; title: string; kind: string; date: string }[] = [
  { id: "d1", title: "OS #2381 — Restaurante Aurora", kind: "Ordem de serviço", date: "Hoje" },
  { id: "d2", title: "Orçamento #ORC-118", kind: "Orçamento", date: "Ontem" },
  { id: "d3", title: "Termo de execução — Mercado Central", kind: "Termo", date: "2d atrás" },
];

export type OperatorServiceDetail = {
  id: string;
  code: string;
  title: string;
  client: string;
  contact: string;
  phone: string;
  address: string;
  time: string;
  status: Status;
  priority?: "alta" | "média" | "baixa";
  equipment: { tag: string; name: string; location: string };
  description: string;
  checklist: { id: string; label: string; done: boolean }[];
};

export const operatorServiceDetails: Record<string, OperatorServiceDetail> = {
  o1: {
    id: "o1", code: "OS-2383", title: "Troca de compressor", client: "Mercado Central",
    contact: "Paulo Henrique", phone: "(41) 99876-1122", address: "R. XV de Novembro, 1200 — Curitiba/PR",
    time: "Iniciado às 10:00", status: "in_progress", priority: "alta",
    equipment: { tag: "EQP-389", name: "Refrigerador vertical 4 portas", location: "Açougue" },
    description: "Substituir compressor com falha intermitente. Cliente já aprovou o orçamento ORC-114.",
    checklist: [
      { id: "k1", label: "Conferir EPI e desligar circuito", done: true },
      { id: "k2", label: "Recolher gás refrigerante", done: true },
      { id: "k3", label: "Substituir compressor", done: false },
      { id: "k4", label: "Recarga e teste de estanqueidade", done: false },
      { id: "k5", label: "Coletar assinatura do cliente", done: false },
    ],
  },
  o2: {
    id: "o2", code: "OS-2384", title: "Diagnóstico elétrico", client: "Edifício Solar",
    contact: "Síndico Ferreira", phone: "(31) 99812-7700", address: "Av. Afonso Pena, 880 — Belo Horizonte/MG",
    time: "Iniciado às 11:30", status: "in_progress",
    equipment: { tag: "EQP-621", name: "Bomba centrífuga 7,5cv", location: "Casa de máquinas" },
    description: "Queda intermitente no quadro QGBT do subsolo. Verificar disjuntores e isolação.",
    checklist: [
      { id: "k1", label: "Inspecionar quadro QGBT", done: true },
      { id: "k2", label: "Medir isolação dos circuitos", done: false },
      { id: "k3", label: "Substituir disjuntor falho", done: false },
      { id: "k4", label: "Emitir relatório técnico", done: false },
    ],
  },
  p1: {
    id: "p1", code: "OS-2391", title: "Instalação de câmera IP", client: "Clínica VitaCare",
    contact: "Dr. Renato Alves", phone: "(19) 99500-2210", address: "R. das Acácias, 320 — Campinas/SP",
    time: "Hoje · 15:00", status: "scheduled",
    equipment: { tag: "—", name: "4 câmeras IP Hikvision", location: "Recepção e corredores" },
    description: "Instalar 4 câmeras IP e configurar acesso remoto via app.",
    checklist: [
      { id: "k1", label: "Posicionar e fixar câmeras", done: false },
      { id: "k2", label: "Passar cabeamento estruturado", done: false },
      { id: "k3", label: "Configurar NVR e acesso remoto", done: false },
      { id: "k4", label: "Treinar equipe da recepção", done: false },
    ],
  },
};

/* ============ Command Palette ============ */

export const commandPaletteItems = [
  { id: "c1", label: "Restaurante Aurora",  kind: "Cliente" },
  { id: "c2", label: "Clínica VitaCare",    kind: "Cliente" },
  { id: "c3", label: "Hotel Mirante",       kind: "Cliente" },
  { id: "e1", label: "Chiller central 200TR", kind: "Equipamento" },
  { id: "e2", label: "Gerador diesel 350kVA", kind: "Equipamento" },
  { id: "s1", label: "OS #2381",            kind: "Atendimento" },
  { id: "s2", label: "OS #2382",            kind: "Atendimento" },
  { id: "s3", label: "OS #2390",            kind: "Atendimento" },
  { id: "o1", label: "Ana Souza",           kind: "Operador" },
  { id: "o2", label: "Carlos Lima",         kind: "Operador" },
];

/* ============ Drill-down: Cliente ============ */

export type ClientServiceRow = {
  id: string;
  code: string;
  title: string;
  date: string;
  operator: string;
  equipmentTag: string;
  status: Status;
};

export type ClientEquipmentRow = {
  id: string;
  tag: string;
  name: string;
  location: string;
  status: Status;
};

export type ClientContact = { id: string; name: string; role: string; phone: string; email: string };

export type ClientDetail = {
  id: string;
  name: string;
  segment: string;
  city: string;
  address: string;
  document: string;
  since: string;
  primaryContact: string;
  contacts: ClientContact[];
  notes: string;
  metrics: { open: number; equipments: number; lastVisit: string; sla: string };
  services: ClientServiceRow[];
  equipments: ClientEquipmentRow[];
};

export const clientDetails: Record<string, ClientDetail> = {
  c1: {
    id: "c1", name: "Restaurante Aurora", segment: "Food service", city: "São Paulo / SP",
    address: "R. Augusta, 1480 — Consolação", document: "CNPJ 12.345.678/0001-90",
    since: "Cliente desde 03/2023", primaryContact: "Mariana Castro",
    contacts: [
      { id: "ct1", name: "Mariana Castro", role: "Gerente", phone: "(11) 98876-2310", email: "mariana@aurora.com.br" },
      { id: "ct2", name: "Roberto Aurora", role: "Proprietário", phone: "(11) 99876-1100", email: "roberto@aurora.com.br" },
    ],
    notes: "Atendimento prioritário das 6h às 10h (horário fora de pico da cozinha).",
    metrics: { open: 2, equipments: 14, lastVisit: "Hoje · 08:30", sla: "98%" },
    services: [
      { id: "cs1", code: "OS-2381", title: "Manutenção preventiva — Refrigerador", date: "Hoje · 08:30", operator: "Ana S.", equipmentTag: "EQP-031", status: "in_progress" },
      { id: "cs2", code: "OS-2388", title: "Limpeza de evaporadora",                date: "Hoje · 16:30", operator: "Ana S.", equipmentTag: "EQP-512", status: "scheduled" },
      { id: "cs3", code: "OS-2371", title: "Troca de gaxetas câmara fria",         date: "18/06/2026",   operator: "Sofia M.", equipmentTag: "EQP-031", status: "done" },
      { id: "cs4", code: "OS-2360", title: "Vistoria mensal completa",              date: "01/06/2026",   operator: "Marina R.", equipmentTag: "EQP-031", status: "done" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-031", name: "Câmara fria #3",                  location: "Cozinha industrial", status: "offline" },
      { id: "ce2", tag: "EQP-512", name: "Split inverter 24.000 BTU",       location: "Salão principal",    status: "done" },
      { id: "ce3", tag: "EQP-712", name: "Fritadeira elétrica dupla",       location: "Linha quente",       status: "scheduled" },
      { id: "ce4", tag: "EQP-845", name: "Refrigerador horizontal 2 portas",location: "Bar",                status: "done" },
    ],
  },
  c2: {
    id: "c2", name: "Clínica VitaCare", segment: "Saúde", city: "Campinas / SP",
    address: "R. das Acácias, 320 — Cambuí", document: "CNPJ 23.456.789/0001-12",
    since: "Cliente desde 07/2022", primaryContact: "Dr. Renato Alves",
    contacts: [
      { id: "ct1", name: "Dr. Renato Alves", role: "Diretor clínico", phone: "(19) 99500-2210", email: "renato@vitacare.med.br" },
      { id: "ct2", name: "Patrícia Lemos",   role: "Compras",         phone: "(19) 98711-9988", email: "compras@vitacare.med.br" },
    ],
    notes: "Acesso técnico apenas mediante agendamento e EPI hospitalar.",
    metrics: { open: 3, equipments: 22, lastVisit: "Ontem · 14:00", sla: "95%" },
    services: [
      { id: "cs1", code: "OS-2382", title: "Instalação de câmera IP",     date: "Hoje · 09:15", operator: "Carlos L.", equipmentTag: "—",       status: "scheduled" },
      { id: "cs2", code: "OS-2388", title: "Limpeza de evaporadora",      date: "Hoje · 16:30", operator: "Ana S.",    equipmentTag: "EQP-512", status: "scheduled" },
      { id: "cs3", code: "OS-2342", title: "Troca de filtros split",      date: "10/06/2026",   operator: "João P.",   equipmentTag: "EQP-512", status: "done" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-512", name: "Split inverter 24.000 BTU", location: "Recepção",     status: "done" },
      { id: "ce2", tag: "EQP-518", name: "Split inverter 12.000 BTU", location: "Consultório 1", status: "scheduled" },
      { id: "ce3", tag: "EQP-602", name: "Autoclave 40L",             location: "Esterilização", status: "warning" },
    ],
  },
  c3: {
    id: "c3", name: "Mercado Central", segment: "Varejo", city: "Curitiba / PR",
    address: "R. XV de Novembro, 1200 — Centro", document: "CNPJ 34.567.890/0001-34",
    since: "Cliente desde 11/2021", primaryContact: "Paulo Henrique",
    contacts: [{ id: "ct1", name: "Paulo Henrique", role: "Gerente operacional", phone: "(41) 99876-1122", email: "paulo@mercadocentral.com.br" }],
    notes: "Janela técnica: 22h às 6h. Acesso pela doca.",
    metrics: { open: 1, equipments: 36, lastVisit: "Hoje · 10:00", sla: "97%" },
    services: [
      { id: "cs1", code: "OS-2383", title: "Troca de compressor", date: "Hoje · 10:00", operator: "Marina R.", equipmentTag: "EQP-389", status: "in_progress" },
      { id: "cs2", code: "OS-2350", title: "Vistoria de gôndolas refrigeradas", date: "08/06/2026", operator: "Sofia M.", equipmentTag: "EQP-389", status: "done" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-389", name: "Refrigerador vertical 4 portas", location: "Açougue",  status: "in_progress" },
      { id: "ce2", tag: "EQP-401", name: "Ilha de congelados 3m",          location: "Corredor 4", status: "done" },
    ],
  },
  c4: {
    id: "c4", name: "Edifício Solar", segment: "Predial", city: "Belo Horizonte / MG",
    address: "Av. Afonso Pena, 880 — Centro", document: "CNPJ 45.678.901/0001-56",
    since: "Cliente desde 02/2024", primaryContact: "Síndico Ferreira",
    contacts: [{ id: "ct1", name: "Síndico Ferreira", role: "Síndico", phone: "(31) 99812-7700", email: "sindico@edsolar.com.br" }],
    notes: "Manutenção do quadro elétrico requer aviso prévio aos moradores.",
    metrics: { open: 2, equipments: 9, lastVisit: "Hoje · 11:30", sla: "92%" },
    services: [
      { id: "cs1", code: "OS-2384", title: "Diagnóstico elétrico",            date: "Hoje · 11:30", operator: "João P.", equipmentTag: "EQP-621", status: "in_progress" },
      { id: "cs2", code: "OS-2387", title: "Substituição de painel elétrico", date: "Hoje · 15:00", operator: "João P.", equipmentTag: "—",       status: "scheduled" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-621", name: "Bomba centrífuga 7,5cv", location: "Casa de máquinas", status: "done" },
      { id: "ce2", tag: "EQP-410", name: "Quadro QGBT principal",   location: "Subsolo",          status: "warning" },
    ],
  },
  c5: {
    id: "c5", name: "Hotel Mirante", segment: "Hotelaria", city: "Rio de Janeiro / RJ",
    address: "Av. Atlântica, 1500 — Copacabana", document: "CNPJ 56.789.012/0001-78",
    since: "Cliente desde 05/2023", primaryContact: "Beatriz Lima",
    contacts: [{ id: "ct1", name: "Beatriz Lima", role: "Gerente de manutenção", phone: "(21) 99700-3344", email: "beatriz@hotelmirante.com.br" }],
    notes: "Atendimentos não podem ocorrer entre 14h e 16h (check-in).",
    metrics: { open: 1, equipments: 41, lastVisit: "Hoje · 12:00", sla: "94%" },
    services: [
      { id: "cs1", code: "OS-2385", title: "Reparo emergencial", date: "Hoje · 12:00", operator: "Renato O.", equipmentTag: "EQP-145", status: "pending" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-145", name: "VRF 12HP", location: "Andar técnico 12", status: "scheduled" },
    ],
  },
  c6: {
    id: "c6", name: "Indústria Beta", segment: "Industrial", city: "Joinville / SC",
    address: "Distrito Industrial, Lote 14", document: "CNPJ 67.890.123/0001-90",
    since: "Cliente desde 09/2020", primaryContact: "Eng. Marcos",
    contacts: [{ id: "ct1", name: "Eng. Marcos", role: "Manutenção", phone: "(47) 99622-1100", email: "marcos@indbeta.com.br" }],
    notes: "Contrato anual com SLA de 4h para equipamentos críticos.",
    metrics: { open: 0, equipments: 58, lastVisit: "Hoje · 14:00", sla: "99%" },
    services: [
      { id: "cs1", code: "OS-2386", title: "Vistoria mensal", date: "Hoje · 14:00", operator: "Sofia M.", equipmentTag: "EQP-077", status: "done" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-077", name: "Compressor de ar 50HP", location: "Galpão 1", status: "warning" },
    ],
  },
  c7: {
    id: "c7", name: "Hospital Norte", segment: "Saúde", city: "Porto Alegre / RS",
    address: "Av. Ipiranga, 6500 — Partenon", document: "CNPJ 78.901.234/0001-12",
    since: "Cliente desde 01/2019", primaryContact: "Coord. Helena",
    contacts: [{ id: "ct1", name: "Coord. Helena", role: "Coord. de engenharia clínica", phone: "(51) 99544-7788", email: "helena@hospnorte.org.br" }],
    notes: "Equipamentos críticos: chillers e geradores. Resposta 24/7.",
    metrics: { open: 4, equipments: 73, lastVisit: "Hoje · 10:30", sla: "99%" },
    services: [
      { id: "cs1", code: "OS-2390", title: "Visita técnica — Chiller", date: "Hoje · 10:30", operator: "Marina R.", equipmentTag: "EQP-118", status: "in_progress" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-118", name: "Chiller central 200TR", location: "Cobertura — Bloco A", status: "danger" },
    ],
  },
  c8: {
    id: "c8", name: "Centro Empresarial Lumière", segment: "Predial", city: "São Paulo / SP",
    address: "Av. Brigadeiro Faria Lima, 3000", document: "CNPJ 89.012.345/0001-34",
    since: "Cliente desde 06/2022", primaryContact: "Adm. Rogério",
    contacts: [{ id: "ct1", name: "Adm. Rogério", role: "Administração predial", phone: "(11) 99432-7766", email: "admin@lumiere.com.br" }],
    notes: "Acesso técnico pelo subsolo 2.",
    metrics: { open: 1, equipments: 27, lastVisit: "02/06/2026", sla: "96%" },
    services: [
      { id: "cs1", code: "OS-2370", title: "Manutenção gerador", date: "02/06/2026", operator: "Renato O.", equipmentTag: "EQP-204", status: "done" },
    ],
    equipments: [
      { id: "ce1", tag: "EQP-204", name: "Gerador diesel 350kVA", location: "Subsolo 2", status: "warning" },
    ],
  },
};

export function getClientById(id: string): ClientDetail | undefined {
  return clientDetails[id];
}

/* ============ Drill-down: Equipamento ============ */

export type EquipmentHistoryRow = {
  id: string;
  date: string;
  code: string;
  title: string;
  operator: string;
  status: Status;
};

export type EquipmentDetail = Equipment & {
  brand: string;
  model: string;
  serial: string;
  installedAt: string;
  warrantyUntil: string;
  specs: { label: string; value: string }[];
  history: EquipmentHistoryRow[];
};

export const equipmentDetails: Record<string, EquipmentDetail> = {
  eq1: {
    ...equipments[0],
    brand: "Carrier", model: "30XA-200", serial: "CAR-200TR-1182",
    installedAt: "15/03/2020", warrantyUntil: "15/03/2025",
    specs: [
      { label: "Capacidade", value: "200 TR" },
      { label: "Fluido refrigerante", value: "R-134a" },
      { label: "Tensão", value: "380V trifásico" },
      { label: "Consumo nominal", value: "220 kW" },
    ],
    history: [
      { id: "h1", date: "Hoje · 10:30",  code: "OS-2390", title: "Visita técnica — alarme de baixa pressão", operator: "Marina R.", status: "in_progress" },
      { id: "h2", date: "12/05/2026",    code: "OS-2289", title: "Troca de filtro secador",                    operator: "João P.",   status: "done" },
      { id: "h3", date: "20/03/2026",    code: "OS-2180", title: "Limpeza de condensador",                     operator: "Sofia M.",  status: "done" },
    ],
  },
  eq2: {
    ...equipments[1],
    brand: "Cummins", model: "C350D5", serial: "CUM-350-9921",
    installedAt: "10/08/2021", warrantyUntil: "10/08/2026",
    specs: [
      { label: "Potência", value: "350 kVA" },
      { label: "Combustível", value: "Diesel S10" },
      { label: "Autonomia", value: "12h em carga plena" },
    ],
    history: [
      { id: "h1", date: "02/06/2026", code: "OS-2370", title: "Manutenção trimestral", operator: "Renato O.", status: "done" },
      { id: "h2", date: "02/03/2026", code: "OS-2155", title: "Troca de óleo e filtros", operator: "Renato O.", status: "done" },
    ],
  },
  eq3: {
    ...equipments[2],
    brand: "Atlas Copco", model: "GA-50", serial: "ATL-50-7732",
    installedAt: "05/01/2022", warrantyUntil: "05/01/2027",
    specs: [
      { label: "Potência", value: "50 HP" },
      { label: "Pressão", value: "8 bar" },
    ],
    history: [
      { id: "h1", date: "20/05/2026", code: "OS-2310", title: "Substituição de elemento separador", operator: "Sofia M.", status: "done" },
    ],
  },
  eq4: {
    ...equipments[3],
    brand: "Plotter", model: "CF-3000", serial: "PLT-3000-2210",
    installedAt: "12/07/2020", warrantyUntil: "12/07/2025",
    specs: [
      { label: "Capacidade", value: "3.000 L" },
      { label: "Temperatura", value: "-18°C a -22°C" },
    ],
    history: [
      { id: "h1", date: "01/06/2026", code: "OS-2371", title: "Troca de gaxetas",        operator: "Sofia M.", status: "done" },
      { id: "h2", date: "Hoje · 08:30", code: "OS-2381", title: "Manutenção preventiva", operator: "Ana S.",   status: "in_progress" },
    ],
  },
  eq5: {
    ...equipments[4],
    brand: "Daikin", model: "FTXS24K", serial: "DAI-24K-4421",
    installedAt: "30/11/2023", warrantyUntil: "30/11/2028",
    specs: [
      { label: "Capacidade", value: "24.000 BTU/h" },
      { label: "Tecnologia", value: "Inverter R-32" },
    ],
    history: [
      { id: "h1", date: "10/06/2026", code: "OS-2342", title: "Troca de filtros", operator: "João P.", status: "done" },
    ],
  },
  eq6: {
    ...equipments[5],
    brand: "Gelopar", model: "GRBA-4P", serial: "GEL-4P-1187",
    installedAt: "22/02/2022", warrantyUntil: "22/02/2027",
    specs: [
      { label: "Portas", value: "4 portas" },
      { label: "Capacidade", value: "1.200 L" },
    ],
    history: [
      { id: "h1", date: "Hoje · 10:00", code: "OS-2383", title: "Troca de compressor", operator: "Marina R.", status: "in_progress" },
    ],
  },
  eq7: {
    ...equipments[6],
    brand: "LG", model: "Multi V S", serial: "LG-VRF-12HP-5512",
    installedAt: "18/09/2021", warrantyUntil: "18/09/2026",
    specs: [
      { label: "Capacidade", value: "12 HP" },
      { label: "Refrigerante", value: "R-410A" },
    ],
    history: [
      { id: "h1", date: "30/04/2026", code: "OS-2244", title: "Manutenção preventiva semestral", operator: "Renato O.", status: "done" },
    ],
  },
  eq8: {
    ...equipments[7],
    brand: "KSB", model: "Megabloc 65-160", serial: "KSB-7.5-9981",
    installedAt: "05/05/2023", warrantyUntil: "05/05/2028",
    specs: [
      { label: "Potência", value: "7,5 cv" },
      { label: "Vazão", value: "60 m³/h" },
    ],
    history: [
      { id: "h1", date: "22/05/2026", code: "OS-2299", title: "Alinhamento de eixo", operator: "João P.", status: "done" },
    ],
  },
};

export function getEquipmentById(id: string): EquipmentDetail | undefined {
  return equipmentDetails[id];
}

/* ============ Ordens de Serviço ============ */

export type WorkOrderType = "corretiva" | "preventiva" | "instalacao" | "diagnostico";

export type WorkOrder = {
  id: string;
  number: string;
  title: string;
  client: string;
  equipmentTag: string;
  type: WorkOrderType;
  openedAt: string;
  scheduledFor: string;
  operator: string;
  value: string;
  sla: { label: string; tone: "ok" | "warn" | "late" };
  status: Status;
  priority?: "alta" | "média" | "baixa";
};

export const workOrderMetrics: Metric[] = [
  { label: "OS abertas",        value: "32",        delta: "+4",  trend: "up",   icon: "ClipboardList" },
  { label: "Em execução",       value: "12",        delta: "+1",  trend: "up",   icon: "Wrench" },
  { label: "Aguardando peça",   value: "5",         delta: "—",   trend: "flat", icon: "Package" },
  { label: "Atrasadas",         value: "3",         delta: "+1",  trend: "up",   icon: "AlertTriangle" },
  { label: "Fechadas no mês",   value: "187",       delta: "+22", trend: "up",   icon: "CheckCircle2" },
  { label: "Ticket médio",      value: "R$ 1.420",  delta: "+6%", trend: "up",   icon: "Wallet" },
];

export const workOrders: WorkOrder[] = [
  { id: "w1",  number: "OS-2381", title: "Manutenção preventiva — Refrigerador", client: "Restaurante Aurora", equipmentTag: "EQP-031", type: "preventiva",  openedAt: "25/06 · 07:40", scheduledFor: "Hoje · 08:30",  operator: "Ana S.",    value: "R$ 480",   sla: { label: "no prazo",       tone: "ok"   }, status: "in_progress" },
  { id: "w2",  number: "OS-2382", title: "Instalação de câmera IP",              client: "Clínica VitaCare",   equipmentTag: "—",       type: "instalacao",  openedAt: "24/06 · 16:10", scheduledFor: "Hoje · 09:15",  operator: "Carlos L.", value: "R$ 1.200", sla: { label: "no prazo",       tone: "ok"   }, status: "scheduled" },
  { id: "w3",  number: "OS-2383", title: "Troca de compressor",                  client: "Mercado Central",    equipmentTag: "EQP-389", type: "corretiva",   openedAt: "25/06 · 06:55", scheduledFor: "Hoje · 10:00",  operator: "Marina R.", value: "R$ 3.850", sla: { label: "alta urgência",  tone: "warn" }, status: "in_progress", priority: "alta" },
  { id: "w4",  number: "OS-2384", title: "Diagnóstico elétrico",                 client: "Edifício Solar",     equipmentTag: "EQP-621", type: "diagnostico", openedAt: "24/06 · 18:30", scheduledFor: "Hoje · 11:30",  operator: "João P.",   value: "R$ 320",   sla: { label: "no prazo",       tone: "ok"   }, status: "scheduled" },
  { id: "w5",  number: "OS-2385", title: "Reparo emergencial",                   client: "Hotel Mirante",      equipmentTag: "EQP-145", type: "corretiva",   openedAt: "25/06 · 11:00", scheduledFor: "Hoje · 12:00",  operator: "Renato O.", value: "R$ 2.100", sla: { label: "atrasada 25min", tone: "late" }, status: "pending",    priority: "alta" },
  { id: "w6",  number: "OS-2386", title: "Vistoria mensal",                       client: "Indústria Beta",     equipmentTag: "EQP-077", type: "preventiva",  openedAt: "20/06 · 09:00", scheduledFor: "Hoje · 14:00",  operator: "Sofia M.",  value: "R$ 760",   sla: { label: "concluída",      tone: "ok"   }, status: "done" },
  { id: "w7",  number: "OS-2387", title: "Substituição de painel elétrico",      client: "Edifício Solar",     equipmentTag: "—",       type: "corretiva",   openedAt: "23/06 · 14:00", scheduledFor: "Hoje · 15:00",  operator: "João P.",   value: "R$ 4.300", sla: { label: "no prazo",       tone: "ok"   }, status: "scheduled" },
  { id: "w8",  number: "OS-2388", title: "Limpeza de evaporadora",               client: "Clínica VitaCare",   equipmentTag: "EQP-512", type: "preventiva",  openedAt: "22/06 · 10:00", scheduledFor: "Hoje · 16:30",  operator: "Ana S.",    value: "R$ 280",   sla: { label: "no prazo",       tone: "ok"   }, status: "scheduled" },
  { id: "w9",  number: "OS-2390", title: "Visita técnica — Chiller",             client: "Hospital Norte",     equipmentTag: "EQP-118", type: "diagnostico", openedAt: "25/06 · 09:50", scheduledFor: "Hoje · 10:30",  operator: "Marina R.", value: "R$ 0",     sla: { label: "alta urgência",  tone: "warn" }, status: "in_progress", priority: "alta" },
  { id: "w10", number: "OS-2370", title: "Manutenção gerador",                    client: "Centro Lumière",     equipmentTag: "EQP-204", type: "preventiva",  openedAt: "02/06 · 08:00", scheduledFor: "02/06 · 09:00", operator: "Renato O.", value: "R$ 1.640", sla: { label: "concluída",      tone: "ok"   }, status: "done" },
];

export type WorkOrderEvent = {
  id: string;
  at: string;
  who: string;
  action: string;
  detail?: string;
  tone?: "ok" | "warn" | "late" | "info";
};

export type WorkOrderItem = { id: string; label: string; qty: number; unit: string; price: string };

export type WorkOrderDetail = WorkOrder & {
  description: string;
  address: string;
  contact: { name: string; role: string; phone: string };
  checklist: { id: string; label: string; done: boolean }[];
  items: WorkOrderItem[];
  timeline: WorkOrderEvent[];
  attachments: { id: string; label: string; kind: string; size: string }[];
  totals: { labor: string; parts: string; total: string };
};

export const workOrderDetails: Record<string, WorkOrderDetail> = {
  w3: {
    ...workOrders[2],
    description: "Substituir compressor com falha intermitente diagnosticada em vistoria anterior. Cliente já aprovou orçamento ORC-114. Garantir limpeza do circuito e teste de estanqueidade pós-troca.",
    address: "R. XV de Novembro, 1200 — Curitiba/PR",
    contact: { name: "Paulo Henrique", role: "Gerente operacional", phone: "(41) 99876-1122" },
    checklist: [
      { id: "k1", label: "Conferir EPI e desligar circuito",  done: true  },
      { id: "k2", label: "Recolher gás refrigerante",         done: true  },
      { id: "k3", label: "Substituir compressor",             done: false },
      { id: "k4", label: "Recarga e teste de estanqueidade",  done: false },
      { id: "k5", label: "Coletar assinatura do cliente",     done: false },
    ],
    items: [
      { id: "i1", label: "Compressor Embraco FFI12HBX 1HP", qty: 1, unit: "un", price: "R$ 2.380" },
      { id: "i2", label: "Gás refrigerante R-134a",         qty: 2, unit: "kg", price: "R$ 240"   },
      { id: "i3", label: "Filtro secador 1/4\"",            qty: 1, unit: "un", price: "R$ 85"    },
      { id: "i4", label: "Mão de obra técnica",             qty: 4, unit: "h",  price: "R$ 1.145" },
    ],
    timeline: [
      { id: "t1", at: "25/06 · 06:55", who: "Sistema",   action: "OS criada a partir de chamado #CH-1182" },
      { id: "t2", at: "25/06 · 07:10", who: "Marina R.", action: "Aceitou atribuição",            tone: "ok" },
      { id: "t3", at: "25/06 · 09:48", who: "Marina R.", action: "Check-in no local",             detail: "GPS confirmado", tone: "info" },
      { id: "t4", at: "25/06 · 10:00", who: "Marina R.", action: "Iniciou execução",              tone: "ok" },
      { id: "t5", at: "25/06 · 10:42", who: "Marina R.", action: "Solicitou peça adicional",      detail: "Filtro secador 1/4\"", tone: "warn" },
    ],
    attachments: [
      { id: "a1", label: "Foto antes — compressor", kind: "Imagem", size: "1,2 MB" },
      { id: "a2", label: "Orçamento ORC-114",       kind: "PDF",    size: "184 KB" },
      { id: "a3", label: "Manual técnico FFI12HBX", kind: "PDF",    size: "3,4 MB" },
    ],
    totals: { labor: "R$ 1.145", parts: "R$ 2.705", total: "R$ 3.850" },
  },
  w1: {
    ...workOrders[0],
    description: "Manutenção preventiva trimestral da câmara fria: troca de gaxetas, limpeza de evaporadora e teste de termostato.",
    address: "R. Augusta, 1480 — Consolação, São Paulo/SP",
    contact: { name: "Mariana Castro", role: "Gerente", phone: "(11) 98876-2310" },
    checklist: [
      { id: "k1", label: "Limpeza de evaporadora", done: true  },
      { id: "k2", label: "Troca de gaxetas",       done: false },
      { id: "k3", label: "Teste de termostato",    done: false },
      { id: "k4", label: "Relatório fotográfico",  done: false },
    ],
    items: [
      { id: "i1", label: "Kit gaxeta câmara fria", qty: 1, unit: "kit", price: "R$ 180" },
      { id: "i2", label: "Mão de obra técnica",    qty: 2, unit: "h",   price: "R$ 300" },
    ],
    timeline: [
      { id: "t1", at: "25/06 · 07:40", who: "Sistema", action: "OS criada pelo plano de manutenção" },
      { id: "t2", at: "25/06 · 08:25", who: "Ana S.",  action: "Check-in no local", tone: "ok" },
      { id: "t3", at: "25/06 · 08:30", who: "Ana S.",  action: "Iniciou execução",  tone: "ok" },
    ],
    attachments: [
      { id: "a1", label: "Plano preventivo PM-2026-Q2", kind: "PDF", size: "210 KB" },
    ],
    totals: { labor: "R$ 300", parts: "R$ 180", total: "R$ 480" },
  },
  w5: {
    ...workOrders[4],
    description: "Falha completa no VRF do andar 12. Hóspedes deslocados. Acionado plantão para diagnóstico e reparo emergencial.",
    address: "Av. Atlântica, 1500 — Copacabana, Rio de Janeiro/RJ",
    contact: { name: "Beatriz Lima", role: "Gerente de manutenção", phone: "(21) 99700-3344" },
    checklist: [
      { id: "k1", label: "Diagnóstico de falha", done: false },
      { id: "k2", label: "Reparo emergencial",   done: false },
      { id: "k3", label: "Teste em carga",       done: false },
    ],
    items: [
      { id: "i1", label: "Hora técnica plantão", qty: 3, unit: "h",  price: "R$ 1.350" },
      { id: "i2", label: "Deslocamento urgente", qty: 1, unit: "un", price: "R$ 320"   },
    ],
    timeline: [
      { id: "t1", at: "25/06 · 11:00", who: "Beatriz Lima", action: "Abriu chamado emergencial" },
      { id: "t2", at: "25/06 · 11:08", who: "Sistema",      action: "OS gerada e atribuída ao plantão", tone: "info" },
      { id: "t3", at: "25/06 · 12:25", who: "Sistema",      action: "SLA estourado em 25 min",          tone: "late" },
    ],
    attachments: [],
    totals: { labor: "R$ 1.350", parts: "R$ 750", total: "R$ 2.100" },
  },
};

function buildFallbackWorkOrder(base: WorkOrder): WorkOrderDetail {
  return {
    ...base,
    description: "Ordem de serviço sem detalhamento expandido nesta versão mockada.",
    address: "Endereço não cadastrado",
    contact: { name: "—", role: "—", phone: "—" },
    checklist: [
      { id: "k1", label: "Check-in no local",  done: base.status === "in_progress" || base.status === "done" },
      { id: "k2", label: "Executar atividade", done: base.status === "done" },
      { id: "k3", label: "Coletar assinatura", done: base.status === "done" },
    ],
    items: [{ id: "i1", label: "Mão de obra técnica", qty: 1, unit: "h", price: base.value }],
    timeline: [
      { id: "t1", at: base.openedAt,     who: "Sistema",     action: "OS criada" },
      { id: "t2", at: base.scheduledFor, who: base.operator, action: "Atribuída", tone: "info" },
    ],
    attachments: [],
    totals: { labor: base.value, parts: "R$ 0", total: base.value },
  };
}

export function getWorkOrderById(id: string): WorkOrderDetail | undefined {
  if (workOrderDetails[id]) return workOrderDetails[id];
  const base = workOrders.find((w) => w.id === id);
  return base ? buildFallbackWorkOrder(base) : undefined;
}
