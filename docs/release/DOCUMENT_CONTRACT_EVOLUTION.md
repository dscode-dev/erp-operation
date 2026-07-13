# Document Contract Evolution — DC02B

## Persistência

Migration: `20260713173000_document_dc02b_contracts`.

### Organization

- `stateRegistration String?`;
- `phoneNumbers String[]`, default vazio.

### Operation

- `referenceMonth Int?`, 1–12;
- `referenceYear Int?`, 2000–2200;
- `maintenanceType OperationMaintenanceType?`;
- `maintenanceChecklistItems OperationMaintenanceChecklistItem[]`;
- `inspectedEquipments OperationInspectedEquipment[]`.

Mês e ano devem existir juntos. A restrição é aplicada no DTO, serviço e PostgreSQL.

### OperationMaintenanceType

`WEEKLY | MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL | CORRECTIVE`.

### OperationMaintenanceChecklistItem

Registro estruturado e ordenado com `maintenanceType`, `description`, `executed`, `observations` e
`position`. Não existem flags por atividade.

### OperationInspectedEquipment

Relação ordenada e sem duplicidade por Operation/Equipment. `sector` é persistido junto aos snapshots
de marca, modelo, capacidade, tag e série para proteger a semântica documental contra alterações
posteriores do cadastro técnico.

## API

Os campos foram adicionados de forma opcional aos payloads de criação/edição de Operation. Respostas
detalhadas incluem as duas coleções ordenadas. Listagens resumidas permanecem inalteradas.

## Blueprint

`metadata.organization` foi expandido de forma opcional. `header.corporate` encapsula a identificação
completa da organização. As novas seções só são produzidas para `TECHNICAL_REPORT` quando existem
dados persistidos, preservando o resultado de operações históricas.
