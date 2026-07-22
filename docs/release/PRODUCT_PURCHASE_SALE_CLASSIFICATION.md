# Product Purchase/Sale Classification

Data: 2026-07-22

## Resultado

O catálogo de produtos passou a distinguir finalidade de compra e venda sem duplicar entidades. Produtos podem ser compráveis, vendáveis ou ambos. A combinação sem finalidade é rejeitada pela API e pelo PostgreSQL.

## Fluxos

- Produtos > Produtos comprados usa `purchasable=true`.
- Produtos > Produtos vendidos usa `sellable=true`.
- Cliente > Vendas consome somente produtos vendáveis.
- Compras e materiais operacionais consomem somente produtos compráveis.

## Compatibilidade

A migration define ambos os campos como `true` para produtos existentes. Nenhum preço, estoque, fornecedor ou histórico foi duplicado ou movido.

## Segurança e integridade

O frontend filtra para orientar a experiência, mas Sales e Procurement aplicam novamente a regra no backend. A constraint `products_commercial_usage_check` impede persistência sem finalidade comercial.

## Refinamento do formulário

O cadastro sugere SKU/código interno editáveis, permite informar custo e valor de venda pelo Pricing oficial e recolhe campos técnicos opcionais. Mensagens de colisão são apresentadas em pt-BR. Não houve inclusão de preço em Product nem nova migration.

## Estoque e disponibilidade em vendas

O estoque passou a distinguir visualmente saldo físico, quantidade separada e disponível. Movimentos foram reduzidos a ações de negócio com saldo projetado. A aba Vendas do cliente agora carrega apenas produtos ativos, vendáveis e com preço vigente na data, eliminando seleções que seriam recusadas posteriormente por ausência de Pricing.
