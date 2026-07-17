# ORBIT — PMOC FIX-01 — Geração oficial do PDF

Data: 2026-07-17

## Escopo e causa raiz

A inspeção confirmou que Preview, Renderer, PdfEngine, Storage e repositório já eram oficiais. A
falha estava na integração: o Drawer guardava uma cópia antiga da execução e perdia o `documentId`
após o refetch disparado pelo render. Também havia falso STALE porque a hora corrente impressa em
“Emissão” participava do fingerprint.

## Correção

- A execução aberta é identificada por ID e novamente resolvida após atualização.
- O documento PMOC é selecionado no backend por tipo, ordenado pelo render mais recente.
- A tela apresenta Sem PDF, PDF disponível e PDF desatualizado.
- Ações: Pré-visualizar, Gerar PDF/Gerar novamente e Baixar PDF.
- O fingerprint neutraliza somente representações do timestamp de geração; mudanças semânticas
  continuam invalidando o artefato.
- Nenhum endpoint, renderer, PdfEngine, Storage, domínio ou migration foi criado.

## Evidência runtime

Fluxo executado em PostgreSQL/Docker com OWNER e Operator reais:

1. PMOC criado: `df5a77aa-5ec6-4fb6-9996-ff30df6d4c59`.
2. OS/Operation criada: `1cbceafe-cb87-4e87-8684-34f02353b318`.
3. Assignment aceito, iniciado e concluído.
4. Preview PMOC gerado com duas assinaturas, dois equipamentos e quatro evidências.
5. Documento oficial: `PMOC-000048`, ID `739340b6-7ee2-4fbf-8a9a-1b2ed3c4e6f3`.
6. PDF baixado e reconhecido como PDF 1.3, três páginas, 23.925 bytes.
7. Fingerprint de Preview igual ao fingerprint do render.
8. Documento confirmado em `/documents?type=PMOC`, status READY.
9. Responsável técnico alterado; download retornou `409 DOCUMENT_STALE`.
10. Nova renderização concluída, download aprovado e revisão 4 registrada no repositório.

Evidências: `/private/tmp/orbit-pmoc-ux02-1-evidence.json`,
`/private/tmp/orbit-pmoc-ux02-1-ui-evidence.json`, `/private/tmp/orbit-pmoc-ux02-1.pdf` e
`/private/tmp/orbit-pmoc-ux02-1-document-drawer.png`.

## Validações

- Backend build e lint: PASS.
- Frontend build e lint: PASS.
- Document Engine focado: 33/33 PASS; suíte backend completa: 84/84 PASS.
- Runtime Preview → Render → Download → Repository → STALE → Re-render: PASS.
- Runtime visual Platform/Operator: PASS, incluindo a transição visível **PDF desatualizado → Gerar
  novamente → PDF disponível**.
- `git diff --check`: PASS.

## Veredito

`ORBIT_PMOC_FIX01_READY`
