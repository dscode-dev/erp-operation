'use client';

import { ClipboardList, Pencil, Plus, Power, Search } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@platform/components/page-header';
import { Pagination } from '@platform/components/pagination';
import {
  ApiClientError,
  maintenanceChecklistTemplatesApi,
  useQuery,
  type MaintenanceChecklistTemplate,
  type OperationMaintenanceType,
  type Paginated,
} from '@erp/api';
import { ConfirmDialog } from '@erp/ui/confirm-dialog';
import { Drawer } from '@erp/ui/drawer';
import { EmptyState } from '@erp/ui/empty-state';
import { Gate } from '@erp/ui/auth/gate';
import { useAuth } from '@erp/ui/auth/auth-provider';
import { SkeletonCard } from '@erp/ui/skeletons';
import { StatusChip } from '@erp/ui/status-chip';

const TYPES: Array<{ value: OperationMaintenanceType; label: string }> = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
  { value: 'CORRECTIVE', label: 'Corretiva' },
];

export default function MaintenanceChecklistsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole('OWNER', 'MANAGER');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<OperationMaintenanceType | ''>('');
  const [editor, setEditor] = useState<MaintenanceChecklistTemplate | 'create' | null>(null);
  const [deactivate, setDeactivate] = useState<MaintenanceChecklistTemplate | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const templates = useQuery<Paginated<MaintenanceChecklistTemplate>>(
    (signal) =>
      maintenanceChecklistTemplatesApi.list({
        page,
        limit,
        search: search || undefined,
        maintenanceType: type || undefined,
        signal,
      }),
    [page, limit, search, type],
  );

  function changed(message: string) {
    setNotice(message);
    void templates.refetch();
    window.setTimeout(() => setNotice(null), 2500);
  }

  return (
    <Gate
      roles={['OWNER', 'MANAGER', 'VIEWER']}
      fallback={<PageHeader eyebrow="Cadastros" title="Checklists de manutenção" description="Acesso restrito." />}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cadastros"
          title="Checklists de manutenção"
          description="Biblioteca reutilizável de atividades para relatórios de visita técnica."
          actions={
            canEdit ? (
              <button
                type="button"
                onClick={() => setEditor('create')}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)]"
              >
                <Plus className="h-4 w-4" /> Novo item
              </button>
            ) : (
              <StatusChip tone="info">Somente leitura</StatusChip>
            )
          }
        />
        {notice && <div className="rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{notice}</div>}
        <div className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 md:grid-cols-[1fr_220px]">
          <label className="flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3">
            <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Buscar atividade"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={type}
            onChange={(event) => { setType(event.target.value as OperationMaintenanceType | ''); setPage(1); }}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
          >
            <option value="">Todas as periodicidades</option>
            {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        {templates.loading ? (
          <SkeletonCard />
        ) : templates.error ? (
          <EmptyState
            icon={ClipboardList}
            title="Não foi possível carregar"
            description={templates.error.message}
            action={
              <button
                type="button"
                onClick={templates.refetch}
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm"
              >
                Tentar novamente
              </button>
            }
          />
        ) : templates.data?.items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhum checklist cadastrado" description="Crie atividades reutilizáveis para tornar a emissão mais rápida e consistente." />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                <tr><th className="px-4 py-3">Atividade</th><th className="px-4 py-3">Periodicidade</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {templates.data?.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.description}</td>
                    <td className="px-4 py-3">{TYPES.find((type) => type.value === item.maintenanceType)?.label}</td>
                    <td className="px-4 py-3"><StatusChip tone={item.active ? 'success' : 'neutral'} dot>{item.active ? 'Ativo' : 'Inativo'}</StatusChip></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1">
                      {canEdit && <button type="button" onClick={() => setEditor(item)} aria-label={`Editar ${item.description}`} className="rounded-md p-2 hover:bg-[var(--color-muted)]"><Pencil className="h-4 w-4" /></button>}
                      {canEdit && item.active && <button type="button" onClick={() => setDeactivate(item)} aria-label={`Desativar ${item.description}`} className="rounded-md p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"><Power className="h-4 w-4" /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {templates.data && <div className="border-t border-[var(--color-border)] p-4"><Pagination pagination={templates.data.pagination} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} /></div>}
          </div>
        )}
        {editor && <ChecklistEditor template={editor === 'create' ? null : editor} onClose={() => setEditor(null)} onSaved={(message) => { setEditor(null); changed(message); }} />}
        <ConfirmDialog
          open={Boolean(deactivate)}
          title="Desativar atividade?"
          description="Ela deixará de aparecer no seletor, mas os relatórios já emitidos permanecem intactos."
          confirmLabel="Desativar"
          danger
          onClose={() => setDeactivate(null)}
          onConfirm={async () => { if (deactivate) { await maintenanceChecklistTemplatesApi.deactivate(deactivate.id); changed('Atividade desativada.'); } }}
        />
      </div>
    </Gate>
  );
}

function ChecklistEditor({ template, onClose, onSaved }: { template: MaintenanceChecklistTemplate | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [maintenanceType, setMaintenanceType] = useState<OperationMaintenanceType>(template?.maintenanceType ?? 'SEMIANNUAL');
  const [description, setDescription] = useState(template?.description ?? '');
  const [active, setActive] = useState(template?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setBusy(true); setError(null);
    try {
      if (template) await maintenanceChecklistTemplatesApi.update(template.id, { maintenanceType, description, active });
      else await maintenanceChecklistTemplatesApi.create({ maintenanceType, description, active });
      onSaved(template ? 'Atividade atualizada.' : 'Atividade criada.');
    } catch (cause) {
      setError(cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Não foi possível salvar.');
    } finally { setBusy(false); }
  }
  return (
    <Drawer open onClose={onClose} title={template ? 'Editar checklist' : 'Novo checklist'} eyebrow="Manutenção" footer={<><button type="button" onClick={onClose} className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm">Cancelar</button><button type="button" disabled={busy || description.trim().length < 3} onClick={save} className="h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar'}</button></>}>
      <div className="space-y-4">
        {error && <div className="rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
        <label className="grid gap-1.5 text-sm font-medium">Periodicidade<select value={maintenanceType} onChange={(event) => setMaintenanceType(event.target.value as OperationMaintenanceType)} className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3">{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-medium">Atividade<textarea autoFocus rows={5} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm" /><span className="text-caption">{description.length}/500</span></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Ativo para seleção</label>
      </div>
    </Drawer>
  );
}
