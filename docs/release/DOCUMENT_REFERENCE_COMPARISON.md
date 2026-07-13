# DC02B — Reference Comparison

Referência analisada: `Relatório de visita técnica .pdf`, documento de uma página fornecido pelo
cliente. A identidade visual e os textos institucionais da referência não foram copiados.

| Conceito da referência                           | Classificação                                          | Representação oficial Orbit                       |
| ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------- |
| Logo e identificação da prestadora               | Faltava riqueza; adicionado                            | Corporate Header compartilhado                    |
| Razão social, CNPJ, endereço, e-mail e telefones | Implementado parcialmente; evoluído                    | Organization + Corporate Header                   |
| Inscrição estadual                               | Ausente; adicionado                                    | `Organization.stateRegistration`                  |
| Cliente e documento                              | Já implementado                                        | Seção Cliente                                     |
| Endereço/local da visita                         | Implementado de forma equivalente                      | Seção Local da visita                             |
| Mês/ano de referência                            | Ausente; adicionado                                    | `referenceMonth` + `referenceYear` persistentes   |
| Manutenção semanal/semestral                     | Ausente; generalizado                                  | `OperationMaintenanceType` expansível             |
| Atividades por periodicidade                     | Ausente; adicionado                                    | `OperationMaintenanceChecklistItem[]`             |
| Marcação de atividade executada                  | Já existia apenas em checklist genérico; especializada | `executed` por item e checkbox no renderer        |
| Tabela ITEM/SETOR/MARCA/MODELO/CAPACIDADE        | Ausente; adicionada                                    | `OperationInspectedEquipment[]` + tabela paginada |
| Observações                                      | Já implementado                                        | Observações finais                                |
| Data e responsável técnico                       | Implementado de forma equivalente                      | Metadados + política de assinatura                |
| Conselho profissional                            | Já implementado                                        | Signature institucional                           |
| Declaração PMOC no rodapé                        | Configurável, não hardcoded                            | `DocumentTemplate.footerContent`                  |
| Conteúdo técnico narrativo                       | Orbit é mais rico                                      | Objetivo, diagnóstico, atividades e recomendações |
| Evidências, QR e materiais                       | Recursos adicionais oficiais                           | Assets/Inventory/Document Engine                  |

## Fora do escopo

- reprodução do layout, logo, contatos e identidade da empresa da referência;
- importação automática de listas regulatórias específicas de um cliente;
- criação de um motor PMOC paralelo no relatório.

Todos os conceitos operacionais encontrados foram classificados; nenhum foi descartado por motivo
puramente visual.
