# Operator Work Order Wizard Parity

Data: 2026-07-22

## Escopo

Alinhamento dos campos e da sequência operacional dos wizards de Ordem de Serviço da Platform e do Operator, mantendo no mobile as etapas próprias de evidências, materiais e assinatura obrigatória.

## Implementação

- criação autônoma: Cliente/local, Escopo, Execução, Checklist, Conteúdo, Evidências, Assinatura e Confirmação;
- execução atribuída: Checklist, Conteúdo, Evidências, Materiais, Assinatura e Confirmação;
- conteúdo oficial: defeito/solicitação, serviços previstos ou executados e observações;
- assinatura obrigatória com nome, função opcional e timestamp único compartilhado com o handoff;
- validação defensiva no backend para criação e conclusão de OS/RVT;
- Renderer com linha exclusiva para data e hora da assinatura no PDF.
- status operacional traduzido no Builder (`COMPLETED` → `Concluída`) para paridade Preview/PDF;
- resumo completo apresentado no mesmo passo da assinatura, tanto na criação autônoma quanto na execução atribuída;
- OS e RVT encerram com `Concluir e gerar PDF`, sem mensagem ou transição de revisão.

## Arquitetura preservada

Operation → Assignment → Document Handoff → DocumentContext → DocumentBuilder → DocumentRenderer → PdfEngine. Não foi criado renderer, PDF, storage, entidade ou fluxo paralelo.

## Validações

- backend lint: aprovado;
- frontend lint: aprovado;
- backend build: aprovado;
- frontend build: aprovado (41 páginas);
- testes backend: 20 suítes, 86 testes aprovados;
- Document Engine focado: 36 testes aprovados;
- `git diff --check`: aprovado.

## Migrações

Nenhuma.
