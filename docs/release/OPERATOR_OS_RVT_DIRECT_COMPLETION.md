# Operator — OS/RVT Direct Completion

## Resultado

O Operator inicia autonomamente apenas Ordem de Serviço e Relatório de Visita Técnica. Esses documentos, sejam autoiniciados ou atribuídos pela gestão, são concluídos em campo, renderizados pelo Document Engine e disponibilizados para download/compartilhamento. A gestão recebe notificação da conclusão.

## Arquitetura preservada

`Operation → Assignment → Document Handoff → DocumentContext → DocumentBuilder → Renderer → PdfEngine → Storage`

Nenhum renderer, PDF local, storage ou entidade paralela foi criado.

## Matriz

| Tipo | Autoinício Operator | Conclusão direta | Emissão Operator |
| --- | --- | --- | --- |
| Ordem de Serviço | Sim | Sim | Sim |
| Relatório de Visita Técnica | Sim | Sim | Sim |
| Outros documentos | Não | Não; mantém revisão | Não |

## AppSec

- Allowlist server-side de tipos autônomos.
- Estado inicial do Operator limitado a `DRAFT`.
- Ownership da Assignment exigido para Handoff, finalize, render e download.
- Render exige documento `READY` e Operation `COMPLETED` do próprio operador.
- Tipos especiais autoiniciados são rejeitados mesmo por chamadas diretas.
- A assinatura técnica padrão é resolvida no `OperationDocument` exato, sem interferência de outros documentos da mesma Operation.

## Persistência

Não houve migration.

## Validações

- Backend build e lint: aprovados.
- Frontend build e lint: aprovados.
- Backend unit: 17 suites, 80 testes aprovados.
- Segurança focada de Assignment: 4 testes aprovados com PostgreSQL.
- Integração focada de Handoff: aprovada com PostgreSQL.
- `git diff --check`: aprovado.
