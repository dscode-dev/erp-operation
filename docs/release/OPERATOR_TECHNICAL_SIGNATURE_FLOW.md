# Operator Technical Signature Flow

Data: 2026-07-22

## Resultado

- Operator configura a própria assinatura em `/operator/profile`;
- assinatura é persistida na entidade oficial `Signature`, vinculada por `userId`;
- OS/RVT autônomas e atribuídas pré-selecionam essa assinatura;
- o backend permite selecionar somente a assinatura do próprio operador responsável;
- finalização cria snapshot imutável e Preview/PDF usam o mesmo DocumentContext;
- a assinatura principal da organização não é mais escolhida para OS/RVT concluídas pelo Operator.

## Endpoints

- `GET /api/v1/signatures/me`;
- `POST /api/v1/signatures/me`;
- `GET /api/v1/signatures/me/download`;
- `PATCH /api/v1/documents/:id/handoff/technical-signature` — ampliado com ownership estrito para Operator.

## Validações

- Prisma validate/generate: aprovado;
- backend lint/build: aprovado;
- frontend lint/build: aprovado;
- unitários backend: 20 suítes, 87 testes aprovados;
- teste focado de assinatura própria: 3 aprovados;
- PostgreSQL integration do handoff: 6 aprovados, incluindo bloqueio entre operadores;
- `git diff --check`: aprovado.

## Migrações

Nenhuma. A modelagem oficial já suportava `Signature.userId` e `OperationDocument.technicalSignatureId`.
