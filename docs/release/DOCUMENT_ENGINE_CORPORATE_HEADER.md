# Document Engine — Corporate Header

## Fonte única

O cabeçalho corporativo é montado por `DocumentBuilderService.documentHeader` exclusivamente com a
configuração e os assets resolvidos pelo `DocumentContext`. O renderer não consulta banco ou storage.

Campos suportados:

- logo oficial;
- razão social e nome fantasia;
- CNPJ e inscrição estadual;
- endereço completo, cidade, estado e CEP;
- telefone principal e telefones adicionais;
- e-mail e website.

Campos ausentes são omitidos sem inserir conteúdo inventado. Telefones são deduplicados. O logo é
centralizado verticalmente na área corporativa e nunca acessado diretamente pelo Builder/Renderer.

## Reuso

Operation documents, Template Preview e Budget usam o mesmo factory. Consequentemente Work Order,
Technical Report, Technical Opinion, PMOC, Receipt, Budget e tipos futuros herdam o cabeçalho sem
condicionais por cliente ou duplicação visual.

## Organização e API

`Organization` recebeu `stateRegistration` opcional e `phoneNumbers` (máximo de cinco). Os dados de
endereço e website já existentes continuam sendo a fonte oficial. A tela de Configurações permite ao
OWNER manter os novos campos.

## Compatibilidade

Os campos legados `header.logo`, `header.organizationName` e os metadados já existentes permanecem no
Blueprint. `header.corporate` é aditivo, permitindo que consumidores anteriores continuem operando.
