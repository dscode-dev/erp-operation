"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { EmptyState } from "@erp/ui/empty-state";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import { CustomerSignaturePreview } from "@erp/ui/documents/customer-signature-preview";
import {
  budgetsApi,
  customersApi,
  documentsApi,
  equipmentsApi,
  operationApi,
  signaturesApi,
  useQuery,
  type Budget,
  type BudgetItemPayload,
  type BudgetItemType,
  type BudgetPaymentMethod,
  type BudgetPayload,
  type Customer,
  type CustomerDetail,
  type DocumentHandoff,
  type EquipmentSummary,
  type Signature,
} from "@erp/api";
import { brlAmountInWords, formatCurrencyBRL, formatNumber } from "@erp/utils";
import { TechnicalSignaturePreview } from "./document-handoff-inbox";

const STEPS = ["Origem", "Dados gerais", "Serviços", "Materiais", "Valores", "Condições", "Assinaturas"];

export function BudgetWizardDrawer({
  open,
  onClose,
  onSaved,
  budget = null,
  initialOperationId = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (budget: Budget) => void;
  budget?: Budget | null;
  initialOperationId?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState<"MANUAL" | "WORK_ORDER">("MANUAL");
  const [operationId, setOperationId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [title, setTitle] = useState("Orçamento de manutenção");
  const [description, setDescription] = useState("");
  const [issuedAt, setIssuedAt] = useState(today());
  const [introduction, setIntroduction] = useState("Atendendo à honrosa solicitação de V.Sa., apresentamos nosso orçamento conforme solicitado.");
  const [items, setItems] = useState<BudgetItemPayload[]>([]);
  const [amountInWords, setAmountInWords] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [validityDays, setValidityDays] = useState("30");
  const [paymentMethods, setPaymentMethods] = useState<BudgetPaymentMethod[]>(["PIX"]);
  const [commercialNotes, setCommercialNotes] = useState("");
  const [observations, setObservations] = useState("");
  const [technicalSignatureId, setTechnicalSignatureId] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = useQuery((signal) => open ? customersApi.listCustomers({ limit: 100, signal }) : Promise.resolve(null), [open]);
  const customer = useQuery<CustomerDetail | null>((signal) => open && customerId ? customersApi.getCustomer(customerId, { signal }) : Promise.resolve(null), [open, customerId]);
  const equipments = useQuery((signal) => open && customerId ? equipmentsApi.listEquipments({ limit: 100, customerId, signal }) : Promise.resolve(null), [open, customerId]);
  const operations = useQuery((signal) => open && origin === "WORK_ORDER" ? operationApi.listOperations({ limit: 100, status: "COMPLETED", signal }) : Promise.resolve(null), [open, origin]);
  const signatures = useQuery((signal) => open ? signaturesApi.listSignatures({ limit: 100, active: true, signal }) : Promise.resolve(null), [open]);
  const handoff = useQuery<DocumentHandoff | null>((signal) => open && budget?.document?.id ? documentsApi.getHandoff(budget.document.id, { signal }) : Promise.resolve(null), [open, budget?.document?.id]);

  useEffect(() => {
    if (!open) return;
    setStep(0); setOrigin(budget?.operationId || initialOperationId ? "WORK_ORDER" : "MANUAL"); setOperationId(budget?.operationId ?? initialOperationId ?? "");
    setCustomerId(budget?.customerId ?? ""); setAddressId(budget?.customerAddressId ?? ""); setEquipmentId(budget?.equipmentId ?? "");
    setTitle(budget?.title ?? "Orçamento de manutenção"); setDescription(budget?.description ?? ""); setIssuedAt(budget?.issuedAt?.slice(0, 10) ?? today());
    setIntroduction(budget?.introduction ?? "Atendendo à honrosa solicitação de V.Sa., apresentamos nosso orçamento conforme solicitado.");
    setItems(budget?.items.map((item) => ({ productId: item.productId, type: item.type, description: item.description, quantity: Number(item.quantity), unit: item.unit, unitPrice: Number(item.unitPrice), sortOrder: item.sortOrder })) ?? []);
    setAmountInWords(budget?.amountInWords ?? ""); setAmountEdited(Boolean(budget?.amountInWords)); setValidityDays(String(budget?.validityDays ?? 30)); setPaymentMethods(budget?.paymentMethods ?? ["PIX"]);
    setCommercialNotes(budget?.commercialNotes ?? ""); setObservations(budget?.observations ?? ""); setTechnicalSignatureId(budget?.document?.technicalSignatureId ?? ""); setSignerName(budget?.customer?.tradeName || budget?.customer?.name || ""); setSignerRole("");
    setCustomerSignature(null); setError(null);
  }, [budget, initialOperationId, open]);

  useEffect(() => {
    if (!addressId && customer.data?.addresses?.[0]) setAddressId(customer.data.addresses[0].id);
    if (!signerName && customer.data) setSignerName(customer.data.tradeName || customer.data.name);
  }, [addressId, customer.data, signerName]);

  useEffect(() => {
    if (technicalSignatureId) return;
    const available = signatures.data?.items ?? [];
    setTechnicalSignatureId(available.find((signature) => signature.isDefault)?.id ?? available[0]?.id ?? "");
  }, [signatures.data, technicalSignatureId]);

  useEffect(() => {
    if (!open || origin !== "WORK_ORDER" || !operationId) return;
    let active = true;
    void operationApi.getOperation(operationId).then((operation) => {
      if (!active) return;
      setCustomerId(operation.customer?.id ?? "");
      setAddressId(operation.address?.id ?? "");
      setEquipmentId(operation.equipment?.id ?? "");
      setTitle(`Orçamento referente à OS-${String(operation.number).padStart(6, "0")}`);
      setDescription(operation.serviceDescription || operation.observations || operation.reportedIssue || "");
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar a Ordem de Serviço."));
    return () => { active = false; };
  }, [open, origin, operationId]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items]);
  const services = items.filter((item) => item.type === "SERVICE");
  const materials = items.filter((item) => item.type === "MATERIAL");
  const selectedSignature = signatures.data?.items.find((signature) => signature.id === technicalSignatureId) ?? null;

  useEffect(() => {
    if (!amountEdited) setAmountInWords(brlAmountInWords(total));
  }, [amountEdited, total]);

  function canContinue(): boolean {
    if (step === 0) return origin === "MANUAL" || Boolean(operationId);
    if (step === 1) return Boolean(customerId && title.trim() && issuedAt && introduction.trim());
    if (step === 2) return services.length > 0;
    if (step === 4) return Boolean(amountInWords.trim());
    if (step === 5) return Number(validityDays) > 0 && paymentMethods.length > 0;
    if (step === 6) return Boolean(technicalSignatureId);
    return true;
  }

  async function submit() {
    setSaving(true); setError(null);
    try {
      const payload: BudgetPayload = {
        operationId: origin === "WORK_ORDER" ? operationId : undefined,
        customerId,
        customerAddressId: addressId || undefined,
        equipmentId: equipmentId || undefined,
        title,
        description: description || undefined,
        issuedAt: new Date(`${issuedAt}T12:00:00`).toISOString(),
        introduction,
        validityDays: Number(validityDays),
        amountInWords,
        paymentMethods,
        commercialNotes: commercialNotes || undefined,
        observations: observations || undefined,
        status: "DRAFT",
        items: items.map((item, index) => ({ ...item, sortOrder: index })),
      };
      let saved = budget
        ? await budgetsApi.updateBudget(budget.id, payload)
        : await budgetsApi.createBudget(payload);
      if (!saved.document?.id) saved = await budgetsApi.getBudget(saved.id);
      if (saved.document?.id) {
        await documentsApi.selectHandoffTechnicalSignature(saved.document.id, technicalSignatureId);
        if (customerSignature && signerName.trim()) {
          await documentsApi.collectCustomerSignature(saved.document.id, {
            signerName: signerName.trim(), signerRole: signerRole.trim() || undefined,
            signatureData: customerSignature, collectedAt: new Date().toISOString(), timezone: "America/Recife",
          });
        }
        saved = await budgetsApi.getBudget(saved.id);
      }
      onSaved(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar o orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return <Drawer open={open} onClose={onClose} eyebrow="Orçamento" title={budget ? `Editar ORC-${String(budget.number).padStart(6, "0")}` : "Novo orçamento"} width="max-w-5xl" footer={<><button onClick={onClose} className={secondaryBtn}>Cancelar</button>{step > 0 && <button onClick={() => setStep((value) => value - 1)} disabled={saving} className={secondaryBtn}><ChevronLeft className="h-4 w-4" /> Voltar</button>}{step < STEPS.length - 1 ? <button onClick={() => setStep((value) => value + 1)} disabled={!canContinue()} className={primaryBtn}>Continuar <ChevronRight className="h-4 w-4" /></button> : <button onClick={submit} disabled={saving || !canContinue()} className={primaryBtn}>{saving ? "Salvando…" : budget ? "Salvar alterações" : "Salvar orçamento"}</button>}</>}>
    <div className="space-y-5">
      {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
      <div className="flex gap-2 overflow-x-auto pb-1">{STEPS.map((label, index) => <span key={label} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${index === step ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : index < step ? "border-[var(--color-success)]/40 text-[var(--color-success)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"}`}>{index + 1}. {label}</span>)}</div>

      {step === 0 && <OriginStep origin={origin} setOrigin={setOrigin} operationId={operationId} setOperationId={setOperationId} operations={operations.data?.items ?? []} />}
      {step === 1 && <div className="grid gap-3 sm:grid-cols-2"><Field label="Cliente"><select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setAddressId(""); setEquipmentId(""); }} className={inputCls}><option value="">Selecione</option>{customers.data?.items.map((row: Customer) => <option key={row.id} value={row.id}>{row.tradeName || row.name}</option>)}</select></Field><Field label="Endereço"><select value={addressId} onChange={(event) => setAddressId(event.target.value)} className={inputCls}><option value="">Selecione</option>{customer.data?.addresses?.map((address) => <option key={address.id} value={address.id}>{address.street}, {address.number} · {address.city}/{address.state}</option>)}</select></Field><Field label="Equipamento (opcional)"><select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)} className={inputCls}><option value="">Nenhum</option>{equipments.data?.items.map((equipment: EquipmentSummary) => <option key={equipment.id} value={equipment.id}>{equipment.name}</option>)}</select></Field><Field label="Data"><input type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} className={inputCls} /></Field><Field label="Título"><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputCls} /></Field><Field label="Descrição"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${inputCls} min-h-20 py-2`} /></Field><div className="sm:col-span-2"><Field label="Texto introdutório"><textarea value={introduction} onChange={(event) => setIntroduction(event.target.value)} className={`${inputCls} min-h-24 py-2`} /></Field></div></div>}
      {step === 2 && <BudgetItemsEditor type="SERVICE" items={items} onChange={setItems} />}
      {step === 3 && <BudgetItemsEditor type="MATERIAL" items={items} onChange={setItems} />}
      {step === 4 && <div className="grid gap-4 md:grid-cols-2"><Summary services={services} materials={materials} total={total} /><Field label="Valor por extenso"><textarea value={amountInWords} onChange={(event) => { setAmountInWords(event.target.value); setAmountEdited(true); }} className={`${inputCls} min-h-28 py-2`} /><span className="text-caption">Gerado automaticamente e editável.</span></Field></div>}
      {step === 5 && <Conditions validityDays={validityDays} setValidityDays={setValidityDays} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} commercialNotes={commercialNotes} setCommercialNotes={setCommercialNotes} observations={observations} setObservations={setObservations} />}
      {step === 6 && <Signatures signatures={signatures.data?.items ?? []} selected={selectedSignature} existingCustomerSignature={handoff.data?.customerSignature ?? null} documentId={budget?.document?.id ?? null} technicalSignatureId={technicalSignatureId} setTechnicalSignatureId={setTechnicalSignatureId} signerName={signerName} setSignerName={setSignerName} signerRole={signerRole} setSignerRole={setSignerRole} setCustomerSignature={setCustomerSignature} />}
    </div>
  </Drawer>;
}

function OriginStep({ origin, setOrigin, operationId, setOperationId, operations }: { origin: "MANUAL" | "WORK_ORDER"; setOrigin: (value: "MANUAL" | "WORK_ORDER") => void; operationId: string; setOperationId: (value: string) => void; operations: Array<{ id: string; number: number; customer: { name: string } | null }> }) {
  return <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { setOrigin("MANUAL"); setOperationId(""); }} className={choiceCls(origin === "MANUAL")}><strong className="block">Criação manual</strong><span className="text-caption">Preencha livremente todos os dados.</span></button><button type="button" onClick={() => setOrigin("WORK_ORDER")} className={choiceCls(origin === "WORK_ORDER")}><strong className="block">A partir de uma OS concluída</strong><span className="text-caption">Importe o atendimento e edite qualquer campo.</span></button>{origin === "WORK_ORDER" && <div className="sm:col-span-2"><Field label="Ordem de Serviço concluída"><select value={operationId} onChange={(event) => setOperationId(event.target.value)} className={inputCls}><option value="">Selecione</option>{operations.map((operation) => <option key={operation.id} value={operation.id}>OS-{String(operation.number).padStart(6, "0")} · {operation.customer?.name ?? "Cliente"}</option>)}</select></Field></div>}</div>;
}

function BudgetItemsEditor({ type, items, onChange }: { type: BudgetItemType; items: BudgetItemPayload[]; onChange: (items: BudgetItemPayload[]) => void }) {
  const [description, setDescription] = useState(""); const [quantity, setQuantity] = useState("1"); const [unit, setUnit] = useState(type === "SERVICE" ? "SERV" : "UN"); const [unitPrice, setUnitPrice] = useState("0");
  const rows = items.map((item, index) => ({ item, index })).filter(({ item }) => item.type === type); const label = type === "SERVICE" ? "serviço" : "material";
  function add() { if (!description.trim() || Number(quantity) <= 0 || Number(unitPrice) < 0) return; onChange([...items, { type, description: description.trim(), quantity: Number(quantity), unit: unit.trim() || "UN", unitPrice: Number(unitPrice) }]); setDescription(""); setQuantity("1"); setUnitPrice("0"); }
  function move(index: number, direction: -1 | 1) { const next = [...items]; const target = index + direction; if (target < 0 || target >= next.length || next[target].type !== type) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next); }
  return <div className="space-y-4"><div><h3 className="font-semibold">{type === "SERVICE" ? "Serviços" : "Materiais"}</h3><p className="text-caption">Itens independentes do catálogo e do estoque.</p></div><div className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 md:grid-cols-[1fr_100px_90px_150px_auto]"><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={`Descrição do ${label}`} className={inputCls} /><input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputCls} aria-label="Quantidade" /><input value={unit} onChange={(event) => setUnit(event.target.value)} className={inputCls} aria-label="Unidade" /><input type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className={inputCls} aria-label="Valor unitário" /><button type="button" onClick={add} className={secondaryBtn}><Plus className="h-4 w-4" /> Adicionar</button></div>{rows.length === 0 ? <EmptyState icon={ShoppingCart} title={`Nenhum ${label} adicionado`} description={`Adicione ${label}s para compor o orçamento.`} /> : <ul className="space-y-2">{rows.map(({ item, index }, position) => <li key={`${type}-${index}`} className="grid items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 md:grid-cols-[1fr_120px_auto_auto]"><div><p className="text-sm font-medium">{item.description}</p><p className="text-caption">{formatNumber(item.quantity)} {item.unit} × {money(item.unitPrice)}</p></div><strong>{money(item.quantity * item.unitPrice)}</strong><div className="flex gap-1"><IconButton onClick={() => move(index, -1)} disabled={position === 0} label="Mover para cima"><ArrowUp className="h-4 w-4" /></IconButton><IconButton onClick={() => move(index, 1)} disabled={position === rows.length - 1} label="Mover para baixo"><ArrowDown className="h-4 w-4" /></IconButton></div><IconButton onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} label="Remover" danger><Trash2 className="h-4 w-4" /></IconButton></li>)}</ul>}</div>;
}

function Summary({ services, materials, total }: { services: BudgetItemPayload[]; materials: BudgetItemPayload[]; total: number }) { return <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4"><h3 className="font-semibold">Valores</h3><div className="mt-3 space-y-2"><Info label="Serviços" value={money(sum(services))} /><Info label="Materiais" value={money(sum(materials))} /><Info label="Valor total" value={money(total)} strong /></div></div>; }
function Conditions({ validityDays, setValidityDays, paymentMethods, setPaymentMethods, commercialNotes, setCommercialNotes, observations, setObservations }: { validityDays: string; setValidityDays: (value: string) => void; paymentMethods: BudgetPaymentMethod[]; setPaymentMethods: (value: BudgetPaymentMethod[]) => void; commercialNotes: string; setCommercialNotes: (value: string) => void; observations: string; setObservations: (value: string) => void }) { const options: Array<[BudgetPaymentMethod, string]> = [["CASH", "Espécie"], ["PIX", "PIX"], ["CREDIT_CARD", "Cartão de crédito"]]; return <div className="space-y-4"><Field label="Validade da proposta (dias)"><input type="number" min="1" max="3650" value={validityDays} onChange={(event) => setValidityDays(event.target.value)} className={inputCls} /></Field><div><p className="mb-2 text-sm font-medium">Formas de pagamento</p><div className="flex flex-wrap gap-2">{options.map(([value, label]) => <label key={value} className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm"><input type="checkbox" checked={paymentMethods.includes(value)} onChange={() => setPaymentMethods(paymentMethods.includes(value) ? paymentMethods.filter((item) => item !== value) : [...paymentMethods, value])} />{label}</label>)}</div></div><Field label="Observações comerciais"><textarea value={commercialNotes} onChange={(event) => setCommercialNotes(event.target.value)} className={`${inputCls} min-h-24 py-2`} /></Field><Field label="Observações gerais"><textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputCls} min-h-20 py-2`} /></Field></div>; }
function Signatures({ signatures, selected, existingCustomerSignature, documentId, technicalSignatureId, setTechnicalSignatureId, signerName, setSignerName, signerRole, setSignerRole, setCustomerSignature }: { signatures: Signature[]; selected: Signature | null; existingCustomerSignature: DocumentHandoff['customerSignature']; documentId: string | null; technicalSignatureId: string; setTechnicalSignatureId: (value: string) => void; signerName: string; setSignerName: (value: string) => void; signerRole: string; setSignerRole: (value: string) => void; setCustomerSignature: (value: string | null) => void }) { return <div className="grid gap-5 lg:grid-cols-2"><div className="space-y-3"><h3 className="font-semibold">Responsável técnico</h3><Field label="Assinatura técnica"><select value={technicalSignatureId} onChange={(event) => setTechnicalSignatureId(event.target.value)} className={inputCls}><option value="">Selecione</option>{signatures.map((signature) => <option key={signature.id} value={signature.id}>{signature.name} · {signature.title}{signature.isDefault ? " · padrão" : ""}</option>)}</select></Field>{selected && <TechnicalSignaturePreview signature={selected} />}</div><div className="space-y-3"><h3 className="font-semibold">Assinatura do cliente</h3>{existingCustomerSignature && documentId && <div className="space-y-2"><CustomerSignaturePreview documentId={documentId} name={existingCustomerSignature.name} /><p className="text-caption">{existingCustomerSignature.name} · {new Date(existingCustomerSignature.collectedAt).toLocaleString("pt-BR")} · coletada por {existingCustomerSignature.collectedBy?.name ?? "usuário não identificado"}</p><p className="text-sm font-medium">Substituir assinatura</p></div>}<div className="grid gap-2 sm:grid-cols-2"><input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Nome do cliente" className={inputCls} /><input value={signerRole} onChange={(event) => setSignerRole(event.target.value)} placeholder="Função ou vínculo" className={inputCls} /></div><SignaturePad onChange={setCustomerSignature} onConfirm={setCustomerSignature} /><p className="text-caption">{existingCustomerSignature ? "Capture somente se precisar substituir a assinatura atual." : "Opcional durante a criação; poderá ser coletada antes da emissão."}</p></div></div>; }

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex justify-between gap-3 text-sm"><span className="text-[var(--color-muted-foreground)]">{label}</span><span className={strong ? "font-semibold" : "font-medium"}>{value}</span></div>; }
function IconButton({ onClick, disabled, label, danger, children }: { onClick: () => void; disabled?: boolean; label: string; danger?: boolean; children: ReactNode }) { return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border disabled:opacity-30 ${danger ? "border-[var(--color-danger)]/30 text-[var(--color-danger)]" : "border-[var(--color-border)]"}`}>{children}</button>; }
function choiceCls(active: boolean) { return `rounded-[var(--radius-lg)] border p-5 text-left ${active ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)]"}`; }
function sum(items: BudgetItemPayload[]) { return items.reduce((total, item) => total + item.quantity * item.unitPrice, 0); }
function money(value: number) { return formatCurrencyBRL(value); }
function today() { return new Date().toISOString().slice(0, 10); }

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";
const primaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50";
const secondaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50";
