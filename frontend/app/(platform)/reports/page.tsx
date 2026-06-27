"use client";

/**
 * Relatórios — Gestão de MODELOS de documento.
 *
 * A Platform não lista documentos emitidos aqui (isso é a Central de Documentos
 * em /documentos). Aqui o OWNER administra os modelos: visualizar, editar,
 * ativar/desativar, definir padrão, importar modelo do cliente e ver versão.
 * Modelos profissionais renderizados via DocumentPaper (prontos para o backend).
 */
import { useMemo, useRef, useState } from "react";
import { FileText, Eye, Pencil, Star, Power, Upload, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonCard } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { Drawer } from "@erp/ui/drawer";
import { Gate } from "@erp/ui/auth/gate";
import { ConfirmDialog } from "@erp/ui/confirm-dialog";
import { DocumentPaper } from "@erp/ui/documents/document-paper";
import { MODEL_BLUEPRINTS, buildDocument, type ModelKey } from "@erp/ui/documents/model-blueprints";
import { TemplateFormDrawer } from "@platform/components/template-form-drawer";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { organizationApi, useQuery, type DocumentTemplate } from "@erp/api";
import { formatDate } from "@erp/utils";

export default function ReportsPage() {
  const { session, hasRole } = useAuth();
  const canEdit = hasRole("OWNER");
  const templates = useQuery((s) => organizationApi.listTemplates({ signal: s }), []);

  const [previewKey, setPreviewKey] = useState<ModelKey | null>(null);
  const [manageKey, setManageKey] = useState<ModelKey | null>(null);

  const org = {
    name: session?.organization.tradeName || session?.organization.legalName || "Climatize",
    segment: session?.organization.segment ?? undefined,
  };

  function templatesOfType(type: DocumentTemplate["type"]): DocumentTemplate[] {
    return (templates.data ?? []).filter((t) => t.type === type);
  }

  return (
    <Gate
      permission="canReports"
      fallback={<div className="max-w-[1200px]"><PageHeader eyebrow="Gestão" title="Relatórios" description="Acesso restrito." /></div>}
    >
      <div className="space-y-6 max-w-[1200px]">
        <PageHeader
          eyebrow="Gestão"
          title="Modelos de documento"
          description="Administre os modelos usados na emissão de documentos pelos operadores."
        />

        {templates.loading && !templates.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : templates.error && !templates.data ? (
          <ErrorState error={templates.error} onRetry={templates.refetch} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODEL_BLUEPRINTS.map((bp) => {
              const list = templatesOfType(bp.templateType);
              const def = list.find((t) => t.isDefault) ?? list[0];
              const activeCount = list.filter((t) => t.isActive).length;
              return (
                <SectionCard key={bp.key}>
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 grid place-items-center text-[var(--color-primary)] shrink-0"><FileText className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-card-title truncate">{bp.label}</h3>
                      <p className="text-caption mt-0.5">{bp.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {def ? <StatusChip tone={def.isActive ? "success" : "neutral"} dot>{def.isActive ? "Ativo" : "Inativo"}</StatusChip> : <StatusChip tone="neutral">Modelo do sistema</StatusChip>}
                    {list.length > 0 && <StatusChip tone="info">{list.length} modelo{list.length > 1 ? "s" : ""}{activeCount !== list.length ? ` · ${activeCount} ativos` : ""}</StatusChip>}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => setPreviewKey(bp.key)} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
                      <Eye className="h-4 w-4" /> Pré-visualizar
                    </button>
                    {canEdit && (
                      <button type="button" onClick={() => setManageKey(bp.key)} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium">
                        <Pencil className="h-4 w-4" /> Gerenciar
                      </button>
                    )}
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview */}
      <Drawer open={previewKey !== null} onClose={() => setPreviewKey(null)} eyebrow="Modelo" title={previewKey ? MODEL_BLUEPRINTS.find((b) => b.key === previewKey)!.label : ""} width="max-w-3xl">
        {previewKey && (() => {
          const bp = MODEL_BLUEPRINTS.find((b) => b.key === previewKey)!;
          const data = buildDocument(bp, { number: "MODELO-EXEMPLO", date: new Date().toISOString(), customer: "Cliente Exemplo", equipment: "Equipamento Exemplo", operator: "Operador", value: 2400, statusLabel: "Modelo" }, { name: org.name });
          return <div className="bg-[var(--color-muted)]/40 -m-5 p-4 sm:p-6"><DocumentPaper data={data} /></div>;
        })()}
      </Drawer>

      {/* Manage */}
      {manageKey && (
        <ManageDrawer
          modelKey={manageKey}
          templates={templatesOfType(MODEL_BLUEPRINTS.find((b) => b.key === manageKey)!.templateType)}
          onClose={() => setManageKey(null)}
          onChanged={templates.refetch}
        />
      )}
    </Gate>
  );
}

function ManageDrawer({
  modelKey,
  templates,
  onClose,
  onChanged,
}: {
  modelKey: ModelKey;
  templates: DocumentTemplate[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const bp = MODEL_BLUEPRINTS.find((b) => b.key === modelKey)!;
  const [busy, setBusy] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<{ template: DocumentTemplate | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocumentTemplate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try { await fn(); onChanged(); } finally { setBusy(null); }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setNotice(null);
    try {
      await organizationApi.uploadAsset("HEADER", file);
      setNotice("Modelo importado como referência. A renderização final será aplicada pelo backend.");
    } catch {
      setNotice("Falha ao importar o modelo.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        eyebrow="Modelos"
        title={`Gerenciar · ${bp.label}`}
        footer={
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={importing} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importar
            </button>
            <button type="button" onClick={() => setForm({ template: null })} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium">
              <Plus className="h-4 w-4" /> Novo modelo
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {notice && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)] flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> {notice}
            </div>
          )}
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum modelo cadastrado para este tipo. Crie um novo ou importe o do cliente.</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => (
                <li key={t.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate flex-1">{t.name}</span>
                    {t.isDefault && <StatusChip tone="primary">Padrão</StatusChip>}
                    {t.isSystem && <StatusChip tone="neutral">Sistema</StatusChip>}
                    <StatusChip tone={t.isActive ? "success" : "neutral"} dot>{t.isActive ? "Ativo" : "Inativo"}</StatusChip>
                  </div>
                  <div className="text-caption mt-1">Versão de {formatDate(t.updatedAt)}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Action icon={Pencil} label="Editar" onClick={() => setForm({ template: t })} />
                    {!t.isDefault && <Action icon={Star} label="Padrão" busy={busy === t.id} onClick={() => act(t.id, () => organizationApi.updateTemplate(t.id, { isDefault: true }))} />}
                    <Action icon={Power} label={t.isActive ? "Desativar" : "Ativar"} busy={busy === t.id} onClick={() => act(t.id, () => organizationApi.updateTemplate(t.id, { isActive: !t.isActive }))} />
                    {!t.isSystem && <Action icon={Trash2} label="Excluir" danger onClick={() => setConfirmDelete(t)} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,application/pdf" onChange={onImport} className="hidden" aria-label="Importar modelo" />
        </div>
      </Drawer>

      <TemplateFormDrawer
        open={form !== null}
        onClose={() => setForm(null)}
        onSaved={onChanged}
        type={bp.templateType}
        typeLabel={bp.label}
        template={form?.template ?? null}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Excluir modelo"
        description={<>Excluir o modelo <strong>{confirmDelete?.name}</strong>?</>}
        confirmLabel="Excluir"
        danger
        onConfirm={() => confirmDelete ? organizationApi.deleteTemplate(confirmDelete.id).then(onChanged) : Promise.resolve()}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}

function Action({ icon: Icon, label, onClick, busy, danger }: { icon: typeof Pencil; label: string; onClick: () => void; busy?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 h-8 text-xs disabled:opacity-50 ${danger ? "border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10" : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}
