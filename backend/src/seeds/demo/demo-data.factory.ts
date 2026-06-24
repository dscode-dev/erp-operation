function dateAt(base: Date, dayOffset: number, hour: number, minute = 0): string {
  const value = new Date(base);
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

export function buildDemoSnapshots(now = new Date()): Record<string, unknown> {
  return {
    'demo.dashboard.v1': {
      generatedAt: now.toISOString(),
      counters: {
        atendimentosHoje: 8,
        ordensPendentes: 5,
        operadoresAtivos: 2,
        servicosEmAndamento: 3,
      },
    },
    'demo.schedule.v1': {
      generatedAt: now.toISOString(),
      items: [
        {
          id: 'demo-schedule-overdue-01',
          title: 'Revisão preventiva do chiller',
          customer: 'Hospital Santa Clara',
          operator: 'joao',
          startsAt: dateAt(now, -1, 14),
          state: 'OVERDUE',
        },
        {
          id: 'demo-schedule-today-01',
          title: 'Higienização de splits',
          customer: 'Colégio Boa Viagem',
          operator: 'maria',
          startsAt: dateAt(now, 0, 9),
          state: 'IN_PROGRESS',
        },
        {
          id: 'demo-schedule-today-02',
          title: 'Diagnóstico de condensadora',
          customer: 'Condomínio Atlântico Sul',
          operator: 'joao',
          startsAt: dateAt(now, 0, 15, 30),
          state: 'SCHEDULED',
        },
        {
          id: 'demo-schedule-tomorrow-01',
          title: 'Inspeção mensal de climatização',
          customer: 'Shopping Recife',
          operator: 'maria',
          startsAt: dateAt(now, 1, 10),
          state: 'SCHEDULED',
        },
      ],
    },
    'demo.finance.v1': {
      generatedAt: now.toISOString(),
      currency: 'BRL',
      summary: {
        entradas: 48750,
        saidas: 18320,
        despesas: 7650,
        projecao30Dias: 62400,
      },
      entries: [
        {
          id: 'demo-finance-in-01',
          kind: 'ENTRY',
          description: 'Contrato mensal Hospital Santa Clara',
          amount: 18500,
        },
        {
          id: 'demo-finance-in-02',
          kind: 'ENTRY',
          description: 'Manutenção Shopping Recife',
          amount: 12800,
        },
        {
          id: 'demo-finance-out-01',
          kind: 'EXPENSE',
          description: 'Compra de filtros e insumos',
          amount: 4280,
        },
        {
          id: 'demo-finance-out-02',
          kind: 'EXPENSE',
          description: 'Locação de plataforma elevatória',
          amount: 3370,
        },
      ],
    },
    'demo.equipment.v1': {
      generatedAt: now.toISOString(),
      items: [
        {
          id: 'demo-equipment-01',
          name: 'Split 12.000 BTU',
          manufacturer: 'Daikin',
          customerName: 'Colégio Boa Viagem',
          state: 'OPERATIONAL',
        },
        {
          id: 'demo-equipment-02',
          name: 'Split 24.000 BTU',
          manufacturer: 'Springer Midea',
          customerName: 'Condomínio Atlântico Sul',
          state: 'MAINTENANCE_DUE',
        },
        {
          id: 'demo-equipment-03',
          name: 'Condensadora',
          manufacturer: 'Carrier',
          customerName: 'Shopping Recife',
          state: 'OPERATIONAL',
        },
        {
          id: 'demo-equipment-04',
          name: 'Chiller',
          manufacturer: 'Trane',
          customerName: 'Hospital Santa Clara',
          state: 'IN_SERVICE',
        },
      ],
    },
  };
}
