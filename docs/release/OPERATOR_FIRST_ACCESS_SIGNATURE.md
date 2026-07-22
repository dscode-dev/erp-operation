# Operator First Access Signature

## Entrega

O primeiro acesso do Operator foi expandido para exigir senha definitiva e assinatura técnica. A assinatura é vinculada ao usuário e persistida no catálogo institucional oficial, ficando imediatamente disponível para seleção em templates, PMOC, Recibo, Orçamento e demais relatórios.

## Arquitetura

`User → Signature(userId unique) → DocumentAssetResolver → Storage`

Não foram criados renderer, storage, tabela de imagem, seletor ou formato documental paralelo.

## Segurança

- verificação da senha temporária;
- senha nova não reutilizável;
- PNG/JPEG com inspeção binária e máximo de 2 MiB;
- transação para senha, relação, revogação de sessões e auditoria;
- compensação do arquivo em falhas;
- resposta sem `storageKey` ou base64.

## Migration

`20260722190000_user_institutional_signature` adiciona `signatures.user_id`, FK para `users`, índice e unicidade.
