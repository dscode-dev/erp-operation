# Recibo por venda — correção da declaração

Data: 23/07/2026

## Causa raiz

A UI gerava a declaração antes de carregar o cliente completo. O placeholder `{CLIENTE}` tornava o
campo não vazio e impedia a regeneração posterior. O mesmo gerador usava a frase “referente ao
serviço” para qualquer origem.

## Correção

- CPF/CNPJ foram adicionados ao prefill da venda.
- A declaração é criada diretamente com o cliente retornado pela venda.
- O efeito assíncrono aguarda o cadastro completo e respeita apenas edição manual explícita.
- Venda usa “venda de produtos” e garantia dos produtos fornecidos.
- OS/manual usam “serviços prestados”.
- Itens vendidos nunca são ocultados pelas observações.
- O fallback do Builder segue a mesma regra por `sourceSaleId`.

## Compatibilidade

Endpoint, DTO de criação, DocumentContext, Blueprint, Renderer e PDF foram preservados. Campos novos
do prefill são aditivos. Não houve migration.

