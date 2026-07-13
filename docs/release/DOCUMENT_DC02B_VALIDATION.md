# DC02B — Validation Evidence

Data: 13 de julho de 2026.

## Gates estáticos

| Gate                      | Resultado                                        |
| ------------------------- | ------------------------------------------------ |
| `npx prisma validate`     | PASS                                             |
| `npx prisma generate`     | PASS                                             |
| Backend lint              | PASS                                             |
| Backend build             | PASS                                             |
| Backend unit tests        | PASS — 17 suites / 65 testes                     |
| PostgreSQL integration    | PASS — 2 suites / 8 testes                       |
| PostgreSQL concurrency    | PASS — 2 suites / 24 testes                      |
| AppSec                    | PASS — 12 suites / 38 testes                     |
| Frontend lint             | PASS, 1 warning preexistente em `bottom-nav.tsx` |
| Frontend build            | PASS — 39 rotas                                  |
| Docker API/frontend build | PASS                                             |
| `git diff --check`        | PASS                                             |

## Validação funcional real

O script local protegido por `ORBIT_RUNTIME_VERIFY=true` atualizou uma Operation real sem criar mocks,
gerou Preview, Render, Download e confirmou o documento no catálogo. O artefato começa por `%PDF-`,
possui 37.056 bytes e foi aberto/renderizado em cinco páginas.

Confirmado no Blueprint/PDF:

- Corporate Header originado da Organization;
- competência junho/2026;
- manutenção semestral;
- checklists semanal e semestral marcados;
- tabela com as cinco colunas oficiais;
- QR Code real;
- foto real resolvida;
- assinaturas institucional e de execução;
- repetição de header/footer e paginação;
- Unicode em português;
- registro em `/api/v1/documents`.

A prova Chrome headless da Platform confirmou `RVT-000015` na Central de Relatórios, abriu o
`DocumentViewer` oficial e encontrou cinco páginas e cinco miniaturas com as seções de identificação,
cliente e local visíveis.

## Testes de volume

O teste de renderer utilizou 75 equipamentos inspecionados e comprovou múltiplas páginas sem bloco
maior que a área imprimível. A fórmula de chunk da tabela passou a reservar explicitamente o padding
do bloco, evitando overflow após o aumento da área do Corporate Header.

## Resultado

Não permanecem bloqueadores técnicos conhecidos para a DC02B.
