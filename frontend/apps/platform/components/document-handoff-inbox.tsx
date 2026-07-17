'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, ClipboardCheck, RefreshCw, Search } from 'lucide-react';
import {
  documentsApi,
  operationApi,
  signaturesApi,
  useQuery,
  type DocumentEditorialStatus,
  type DocumentHandoff,
  type DocumentKind,
  type OperationDetail,
  type Paginated,
  type Signature,
} from '@erp/api';
import { DOCUMENT_KIND_LABEL } from '@erp/types';
import { Drawer } from '@erp/ui/drawer';
import { EmptyState } from '@erp/ui/empty-state';
import { ErrorState } from '@erp/ui/states';
import { SkeletonList } from '@erp/ui/skeletons';
import { StatusChip } from '@erp/ui/status-chip';
import { SignaturePad } from '@erp/ui/documents/signature-pad';
import { DocumentViewer } from '@erp/ui/documents/document-viewer';
import { Pagination } from './pagination';

const STATUS: Record<DocumentEditorialStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Rascunho recebido', tone: 'neutral' },
  PENDING: { label: 'Revisão pendente', tone: 'warning' },
  READY: { label: 'Pronto', tone: 'success' },
  STALE: { label: 'Desatualizado', tone: 'danger' },
};
const input = 'w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]';

export function DocumentHandoffInbox() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocumentEditorialStatus | ''>('');
  const [type, setType] = useState<DocumentKind | ''>('');
  const [selected, setSelected] = useState<DocumentHandoff | null>(null);
  const [tick, setTick] = useState(0);
  const handoffs = useQuery<Paginated<DocumentHandoff>>(
    (signal) => documentsApi.listHandoffs({ page, limit: 10, search: search || undefined, status: status || undefined, type: type || undefined, signal }),
    [page, search, status, type, tick],
  );
  const items = handoffs.data?.items ?? [];
  return <section className="space-y-3">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-section-title">Relatórios recebidos</h2><p className="text-caption">Coletas enviadas pelo Operator para revisão, assinatura técnica e emissão.</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" /><input className={`${input} pl-8`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Número, cliente ou operador" /></label><select className={input} value={status} onChange={(event) => { setStatus(event.target.value as DocumentEditorialStatus | ''); setPage(1); }}><option value="">Todos os status</option>{Object.entries(STATUS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select><select className={input} value={type} onChange={(event) => { setType(event.target.value as DocumentKind | ''); setPage(1); }}><option value="">Todos os tipos</option>{(['WORK_ORDER', 'TECHNICAL_REPORT', 'TECHNICAL_OPINION', 'BUDGET', 'PMOC'] as DocumentKind[]).map((item) => <option key={item} value={item}>{DOCUMENT_KIND_LABEL[item]}</option>)}</select></div></div>
    {handoffs.loading && !handoffs.data ? <SkeletonList rows={4} /> : handoffs.error && !handoffs.data ? <ErrorState error={handoffs.error} onRetry={handoffs.refetch} /> : items.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nenhum relatório aguardando revisão" description="As coletas enviadas pelo Operator aparecerão aqui." /> : <div className="space-y-3"><div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-[var(--color-border)] text-left text-caption"><th className="p-3">Relatório</th><th>Cliente</th><th>Operação</th><th>Operador</th><th>Envio</th><th>Equip.</th><th>Evidências</th><th>Assinaturas</th><th>Status</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/60"><td className="p-3"><strong>{item.number}</strong><span className="block text-caption">{DOCUMENT_KIND_LABEL[item.type]} · {item.origin === 'OPERATOR' ? 'Operator' : 'Platform'}</span></td><td>{item.operation?.customer.name ?? '—'}</td><td>{item.operation ? `OP-${String(item.operation.number).padStart(6, '0')}` : '—'}</td><td>{item.operation?.operator.name ?? '—'}</td><td>{item.submittedAt ? new Date(item.submittedAt).toLocaleString('pt-BR') : '—'}</td><td>{item.operation?.equipmentCount ?? 0}</td><td>{item.operation?.evidenceCount ?? 0}</td><td><span className={item.customerSignature ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>{item.customerSignature ? 'Cliente ✓' : item.customerSignatureRequired ? 'Cliente pendente' : 'Cliente N/A'}</span><span className="block text-caption">{item.technicalSignature ? 'Técnica ✓' : 'Técnica pendente'}</span></td><td><StatusChip tone={STATUS[item.editorialStatus].tone}>{STATUS[item.editorialStatus].label}</StatusChip></td></tr>)}</tbody></table></div>{handoffs.data && <Pagination pagination={handoffs.data.pagination} onPageChange={setPage} onPageSizeChange={() => undefined} pageSizeOptions={[10]} />}</div>}
    <DocumentReviewDrawer handoff={selected} onClose={() => setSelected(null)} onChanged={() => { setTick((value) => value + 1); handoffs.refetch(); }} />
  </section>;
}

function DocumentReviewDrawer({ handoff, onClose, onChanged }: { handoff: DocumentHandoff | null; onClose: () => void; onChanged: () => void }) {
  const detail = useQuery<OperationDetail | null>((signal) => handoff?.operationId ? operationApi.getOperation(handoff.operationId, { signal }) : Promise.resolve(null), [handoff?.operationId]);
  const signatures = useQuery<Paginated<Signature>>((signal) => handoff ? signaturesApi.listSignatures({ page: 1, limit: 100, active: true, signal }) : Promise.resolve({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }), [handoff?.id]);
  const [current, setCurrent] = useState<DocumentHandoff | null>(handoff);
  const [form, setForm] = useState({ issue: '', diagnosis: '', service: '', recommendations: '', observations: '' });
  const [technicalSignatureId, setTechnicalSignatureId] = useState('');
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  useEffect(() => { setCurrent(handoff); setTechnicalSignatureId(handoff?.technicalSignature?.id ?? ''); setSignerName(handoff?.customerSignature?.name ?? ''); setError(null); setFeedback(null); }, [handoff]);
  useEffect(() => { if (!detail.data) return; setForm({ issue: detail.data.reportedIssue ?? '', diagnosis: detail.data.technicalDiagnosis ?? '', service: detail.data.serviceDescription ?? '', recommendations: detail.data.technicalRecommendations ?? '', observations: detail.data.observations ?? '' }); }, [detail.data]);
  const selectedSignature = useMemo(() => signatures.data?.items.find((item) => item.id === technicalSignatureId) ?? null, [signatures.data, technicalSignatureId]);

  async function run(action: 'save' | 'finalize') {
    if (!current || !detail.data) return;
    setBusy(action); setError(null); setFeedback(null);
    try {
      await operationApi.updateOperation(detail.data.id, { reportedIssue: form.issue, technicalDiagnosis: form.diagnosis, serviceDescription: form.service, technicalRecommendations: form.recommendations, observations: form.observations });
      let next = await documentsApi.startHandoffReview(current.id);
      if (customerSignature) next = await documentsApi.collectCustomerSignature(current.id, { signerName: signerName.trim(), signatureData: customerSignature, collectedAt: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Recife' });
      if (technicalSignatureId && technicalSignatureId !== next.technicalSignature?.id) next = await documentsApi.selectHandoffTechnicalSignature(current.id, technicalSignatureId);
      if (action === 'finalize') next = await documentsApi.finalizeHandoffReview(current.id);
      setCurrent(next); setCustomerSignature(null); setFeedback(action === 'finalize' ? 'Revisão finalizada. O documento está pronto para Preview e emissão.' : 'Revisão salva como pendente.'); onChanged(); detail.refetch();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a revisão.'); }
    finally { setBusy(null); }
  }

  return <Drawer open={Boolean(handoff)} onClose={onClose} eyebrow="Revisão documental" title={current?.number ?? ''} width="max-w-[1380px]">{!current ? null : detail.loading && !detail.data ? <SkeletonList rows={6} /> : detail.error && !detail.data ? <ErrorState error={detail.error} onRetry={detail.refetch} /> : !detail.data ? <EmptyState icon={ClipboardCheck} title="Operação indisponível" /> : <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Origem" value={current.origin === 'OPERATOR' ? 'Coleta do Operator' : 'Criação pela Platform'} /><Info label="Operador" value={current.collectedBy?.name ?? current.operation?.operator.name} /><Info label="Cliente" value={current.operation?.customer.name} /><Info label="Status" value={STATUS[current.editorialStatus].label} /><Info label="Equipamentos" value={String(current.operation?.equipmentCount ?? 0)} /><Info label="Evidências" value={String(current.operation?.evidenceCount ?? 0)} /><Info label="Assinatura do cliente" value={current.customerSignature ? `${current.customerSignature.name} · ${new Date(current.customerSignature.collectedAt).toLocaleString('pt-BR')}` : current.customerSignatureRequired ? 'Pendente' : 'Não aplicável'} /><Info label="Revisões" value={String(current.revisionCount)} /></div>
    <section className="space-y-3"><div><h3 className="font-semibold">Dados coletados e complementação técnica</h3><p className="text-caption">Todos os campos permanecem editáveis durante a revisão. O valor original está preservado no histórico append-only.</p></div><div className="grid gap-3 md:grid-cols-2"><Area label="Solicitação / motivo" value={form.issue} onChange={(value) => setForm((item) => ({ ...item, issue: value }))} /><Area label="Diagnóstico / condições encontradas" value={form.diagnosis} onChange={(value) => setForm((item) => ({ ...item, diagnosis: value }))} /><Area label="Serviços / análise" value={form.service} onChange={(value) => setForm((item) => ({ ...item, service: value }))} /><Area label="Recomendações" value={form.recommendations} onChange={(value) => setForm((item) => ({ ...item, recommendations: value }))} /><Area label="Observações finais" value={form.observations} onChange={(value) => setForm((item) => ({ ...item, observations: value }))} /></div></section>
    <section className="space-y-3"><div><h3 className="font-semibold">Evidências coletadas</h3><p className="text-caption">Arquivos registrados na operação e utilizados pelo Document Engine.</p></div>{detail.data.photos.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{detail.data.photos.map((photo) => <OperationEvidence key={photo.id} photo={photo} />)}</div> : <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-5 text-center text-caption">Nenhuma evidência anexada.</div>}</section>
    {current.customerSignature && <CustomerSignaturePreview documentId={current.id} name={current.customerSignature.name} />}
    {current.customerSignatureRequired && !current.customerSignature && <section className="space-y-3"><h3 className="font-semibold">Assinatura do cliente</h3><input className={input} value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Nome do signatário" /><SignaturePad onChange={setCustomerSignature} onConfirm={setCustomerSignature} /></section>}
    <section className="space-y-3"><div><h3 className="font-semibold">Responsável técnico</h3><p className="text-caption">A escolha vale somente para este documento e será preservada como snapshot na finalização.</p></div><select className={input} value={technicalSignatureId} onChange={(event) => setTechnicalSignatureId(event.target.value)}><option value="">Selecione a assinatura técnica…</option>{(signatures.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.title}{item.isDefault ? ' · padrão' : ''}</option>)}</select>{selectedSignature && <TechnicalSignaturePreview signature={selectedSignature} />}</section>
    {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}{feedback && <p className="flex items-center gap-1.5 text-sm text-[var(--color-success)]"><CheckCircle2 className="h-4 w-4" />{feedback}</p>}
    <div className="flex flex-wrap gap-2"><button className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium disabled:opacity-50" disabled={Boolean(busy)} onClick={() => void run('save')}>{busy === 'save' ? 'Salvando…' : 'Salvar revisão'}</button><button className="h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50" disabled={Boolean(busy) || !technicalSignatureId || (Boolean(current.customerSignatureRequired) && !current.customerSignature && !customerSignature)} onClick={() => void run('finalize')}>{busy === 'finalize' ? 'Finalizando…' : 'Finalizar revisão'}</button><button className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm" onClick={() => { detail.refetch(); setFeedback(null); }}><RefreshCw className="h-4 w-4" />Atualizar</button></div>
    {(current.editorialStatus === 'READY' || current.editorialStatus === 'STALE') && <section className="space-y-2"><h3 className="font-semibold">Preview e emissão oficial</h3><DocumentViewer source={{ documentId: current.id, operationId: current.operationId, type: current.type }} title={current.number} canRender={current.editorialStatus === 'READY'} canDownload onRendered={onChanged} /></section>}
  </div>}</Drawer>;
}

function Info({ label, value }: { label: string; value?: string | null }) { return <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><div className="text-caption">{label}</div><div className="text-sm font-medium">{value || '—'}</div></div>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><textarea className={`${input} min-h-28 resize-y`} value={value} onChange={(event) => onChange(event.target.value)} maxLength={30000} /></label>; }

function CustomerSignaturePreview({ documentId, name }: { documentId: string; name: string }) {
  const image = useQuery((signal) => documentsApi.getCustomerSignatureImage(documentId, { signal }), [documentId]);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!image.data?.blob) return;
    const objectUrl = URL.createObjectURL(image.data.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image.data]);
  return <section className="space-y-2"><h3 className="font-semibold">Assinatura do cliente coletada</h3><div className="grid min-h-28 place-items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-3">{url ? <Image unoptimized src={url} width={320} height={96} alt={`Assinatura de ${name}`} className="max-h-24 max-w-full object-contain" /> : image.error ? <ErrorState error={image.error} onRetry={image.refetch} /> : <span className="text-caption">Carregando assinatura…</span>}</div></section>;
}

function TechnicalSignaturePreview({ signature }: { signature: Signature }) {
  const image = useQuery((signal) => signaturesApi.downloadSignatureImage(signature.id, { signal }), [signature.id]);
  const source = image.data ? `data:${image.data.mimeType};base64,${image.data.contentBase64}` : null;
  return <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm sm:grid-cols-[180px_1fr] sm:items-center"><div className="grid min-h-24 place-items-center rounded bg-white p-2">{source ? <Image unoptimized src={source} width={180} height={80} alt={`Assinatura de ${signature.name}`} className="max-h-20 max-w-full object-contain" /> : image.error ? <span className="text-xs text-[var(--color-danger)]">Imagem indisponível</span> : <span className="text-caption">Carregando imagem…</span>}</div><div><strong>{signature.name}</strong><span className="block text-caption">{[signature.profession, signature.title, signature.professionalCouncil, signature.registrationNumber, signature.department].filter(Boolean).join(' · ')}</span></div></div>;
}

function OperationEvidence({ photo }: { photo: OperationDetail['photos'][number] }) {
  const image = useQuery((signal) => operationApi.getOperationPhoto(photo.id, { signal }), [photo.id]);
  const source = image.data ? `data:${image.data.mimeType};base64,${image.data.contentBase64}` : null;
  return <figure className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"><div className="grid aspect-[4/3] place-items-center bg-[var(--color-muted)]">{source ? <Image unoptimized src={source} width={640} height={480} alt={photo.caption || 'Evidência da operação'} className="h-full w-full object-contain" /> : image.error ? <button type="button" className="text-xs text-[var(--color-danger)]" onClick={image.refetch}>Tentar novamente</button> : <span className="text-caption">Carregando…</span>}</div><figcaption className="p-2 text-xs">{photo.caption || 'Sem legenda'}</figcaption></figure>;
}
