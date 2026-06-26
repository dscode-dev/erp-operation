export const DEMO_MARKER = '[DEMO_DATA_V1]';
export const DEMO_MANIFEST_KEY = 'demo.manifest.v1';

export const DEMO_SETTING_KEYS = [
  DEMO_MANIFEST_KEY,
  'demo.dashboard.v1',
  'demo.schedule.v1',
  'demo.finance.v1',
] as const;

export const DEMO_USER_DEFINITIONS = [
  {
    username: 'ninja',
    email: 'owner@example.com',
    name: 'Daniel',
    role: 'OWNER',
    jobTitle: 'Diretor',
  },
  {
    username: 'ricardo',
    email: 'ricardo@climatize.com',
    name: 'Ricardo Almeida',
    role: 'MANAGER',
    jobTitle: 'Gerente de Operações',
  },
  {
    username: 'joao',
    email: 'joao@climatize.com',
    name: 'João Henrique',
    role: 'OPERATOR',
    jobTitle: 'Técnico de Refrigeração',
  },
  {
    username: 'maria',
    email: 'maria@climatize.com',
    name: 'Maria Eduarda',
    role: 'OPERATOR',
    jobTitle: 'Técnica de Climatização',
  },
  {
    username: 'financeiro',
    email: 'financeiro@climatize.com',
    name: 'Ana Paula',
    role: 'VIEWER',
    jobTitle: 'Assistente Administrativa',
  },
] as const;
