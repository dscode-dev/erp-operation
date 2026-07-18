# ORBIT — Document Certification DC-05 — Recibo / Garantia

## Arquitetura

Fluxo oficial: Operation → DocumentContext → DocumentBuilder → DocumentBlueprint → LayoutEngine →
DocumentRenderer → PdfEngine → Storage → Repositório. Nenhum engine, renderer, storage, wizard ou
domínio documental paralelo foi criado.

## Fluxos e Blueprint

- Manual, sem criar OS documental artificial.
- Por OS concluída, com preenchimento acelerado e todos os campos editáveis.
- Garantia: nenhuma, 30, 60, 90 (padrão), 180, 365 dias ou personalizada.
- Somente assinatura técnica institucional ativa, selecionada por documento.
- Seções: Identificação; Declaração; Garantia; Responsável técnico.
- Fotos, documentos relacionados e assinatura de cliente não integram RECEIPT.

## Persistência e segurança

Migration aditiva `20260718170000_dc05_receipt_certification`. Constraints impedem valor negativo
e garantia inválida. RBAC OWNER/MANAGER, validação DTO, Handoff auditável, Storage privado e download
binário autenticado permanecem aplicados.

## Validações

- Prisma validate/generate e migration deploy: aprovados (51 migrations sincronizadas);
- lint/build backend e frontend: aprovados;
- unitários backend: 85/85; teste focado Document Engine: 34/34;
- PostgreSQL integration: 12/12; concorrência: 24/24;
- runtime UI: origens manual/OS, cinco etapas, campos editáveis e ausência de assinatura do cliente;
- runtime documental `REC-000057`: Preview → Render → Download, PDF `%PDF-` de 15.316 bytes e
  registro no Repositório — aprovado;
- `git diff --check`: aprovado.

## Risco residual fora do escopo

A suíte global de segurança ficou em 48/49: o spec preexistente de PMOC
`maintenance-pmoc-closure.security.spec.ts` espera 403 de um ator em geração concorrente, mas recebe
201. A repetição isolada reproduziu a falha. O cenário não toca RECEIPT nem arquivos DC-05 e deve ser
corrigido no backlog PMOC, sem ampliar esta certificação.

## Veredito

`ORBIT_DC05_RECEIPT_READY`
