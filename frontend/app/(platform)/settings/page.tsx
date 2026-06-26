"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, Upload, FileText, Image as ImageIcon, Palette, Building2, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonCard } from "@erp/ui/skeletons";
import { AsyncBoundary } from "@erp/ui/states";
import { useAuth } from "@erp/ui/auth/auth-provider";
import {
  organizationApi,
  useQuery,
  ApiClientError,
  type BrandAssetType,
  type DocumentTemplate,
  type Organization,
  type OrganizationSettings,
} from "@erp/api";
import { DOCUMENT_KIND_LABEL } from "@erp/types";

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("OWNER");

  const org = useQuery<Organization>((signal) => organizationApi.getOrganization({ signal }), []);
  const settings = useQuery<OrganizationSettings>((signal) => organizationApi.getOrganizationSettings({ signal }), []);
  const templates = useQuery<DocumentTemplate[]>((signal) => organizationApi.listTemplates({ signal }), []);

  return (
    <div className="space-y-6 max-w-[1100px]">
      <PageHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Identidade visual, dados da organização, parâmetros e modelos de documento."
        actions={!canEdit ? <StatusChip tone="info">Somente leitura</StatusChip> : undefined}
      />

      <BrandingSection canEdit={canEdit} />

      <AsyncBoundary loading={org.loading} error={org.error} data={org.data} onRetry={org.refetch} skeleton={<SkeletonCard />}>
        {(data) => <OrganizationSection org={data} canEdit={canEdit} onSaved={org.refetch} />}
      </AsyncBoundary>

      <AsyncBoundary loading={settings.loading} error={settings.error} data={settings.data} onRetry={settings.refetch} skeleton={<SkeletonCard />}>
        {(data) => <SettingsSection settings={data} canEdit={canEdit} onSaved={settings.refetch} />}
      </AsyncBoundary>

      <AsyncBoundary loading={templates.loading} error={templates.error} data={templates.data} onRetry={templates.refetch} skeleton={<SkeletonCard />}>
        {(data) => <TemplatesSection templates={data} />}
      </AsyncBoundary>
    </div>
  );
}

/* ---------- Branding ---------- */

const ASSET_TYPES: { type: BrandAssetType; label: string; icon: typeof ImageIcon }[] = [
  { type: "LOGO", label: "Logotipo", icon: ImageIcon },
  { type: "HEADER", label: "Cabeçalho", icon: FileText },
  { type: "FOOTER", label: "Rodapé", icon: FileText },
];

function BrandingSection({ canEdit }: { canEdit: boolean }) {
  return (
    <SectionCard title="Identidade visual" icon={Palette} description="Logotipo, cabeçalho e rodapé dos documentos.">
      <div className="grid gap-4 sm:grid-cols-3">
        {ASSET_TYPES.map((a) => (
          <AssetUploader key={a.type} type={a.type} label={a.label} icon={a.icon} canEdit={canEdit} />
        ))}
      </div>
    </SectionCard>
  );
}

function AssetUploader({ type, label, icon: Icon, canEdit }: { type: BrandAssetType; label: string; icon: typeof ImageIcon; canEdit: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Máximo de 5 MiB."); return; }
    setBusy(true); setError(null);
    try {
      const asset = await organizationApi.uploadAsset(type, file);
      const content = await organizationApi.getAsset(asset.id);
      setPreview(content.mimeType.startsWith("image/") ? `data:${content.mimeType};base64,${content.contentBase64}` : null);
      setFileName(asset.originalFileName);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha no upload.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="h-24 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] grid place-items-center bg-[var(--color-muted)]/30 overflow-hidden">
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
          : preview ? <img src={preview} alt={label} className="h-full w-full object-contain" />
          : fileName ? <span className="text-caption px-2 text-center">{fileName}</span>
          : <span className="text-caption">Nenhum arquivo</span>}
      </div>
      {error && <p className="mt-1 text-[11px] text-[var(--color-danger)]">{error}</p>}
      {canEdit && (
        <>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50">
            <Upload className="h-4 w-4" /> Enviar
          </button>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,application/pdf" onChange={onFile} className="hidden" aria-label={`Enviar ${label}`} />
        </>
      )}
    </div>
  );
}

/* ---------- Organization ---------- */

function OrganizationSection({ org, canEdit, onSaved }: { org: Organization; canEdit: boolean; onSaved: () => void }) {
  const [form, setForm] = useState(org);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(org), [org]);
  function set<K extends keyof Organization>(k: K, v: Organization[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await organizationApi.updateOrganization({
        legalName: form.legalName, tradeName: form.tradeName, cnpj: form.cnpj, email: form.email,
        phone: form.phone, city: form.city, state: form.state,
        primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
      });
      onSaved();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Organização" icon={Building2} action={canEdit ? <SaveButton saving={saving} saved={saved} onClick={save} /> : undefined}>
      {error && <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Razão social" value={form.legalName} onChange={(v) => set("legalName", v)} disabled={!canEdit} />
        <Input label="Nome fantasia" value={form.tradeName} onChange={(v) => set("tradeName", v)} disabled={!canEdit} />
        <Input label="CNPJ" value={form.cnpj} onChange={(v) => set("cnpj", v)} disabled={!canEdit} />
        <Input label="E-mail" value={form.email} onChange={(v) => set("email", v)} disabled={!canEdit} />
        <Input label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} disabled={!canEdit} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Cidade" value={form.city} onChange={(v) => set("city", v)} disabled={!canEdit} />
          <Input label="UF" value={form.state} onChange={(v) => set("state", v)} disabled={!canEdit} />
        </div>
        <ColorInput label="Cor primária" value={form.primaryColor} onChange={(v) => set("primaryColor", v)} disabled={!canEdit} />
        <ColorInput label="Cor secundária" value={form.secondaryColor} onChange={(v) => set("secondaryColor", v)} disabled={!canEdit} />
      </div>
    </SectionCard>
  );
}

/* ---------- Settings ---------- */

function SettingsSection({ settings, canEdit, onSaved }: { settings: OrganizationSettings; canEdit: boolean; onSaved: () => void }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(settings), [settings]);
  function set<K extends keyof OrganizationSettings>(k: K, v: OrganizationSettings[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true); setSaved(false);
    try {
      await organizationApi.updateOrganizationSettings({ language: form.language, timezone: form.timezone, currency: form.currency, documentPrefix: form.documentPrefix });
      onSaved(); setSaved(true); setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title="Parâmetros" icon={SlidersHorizontal} action={canEdit ? <SaveButton saving={saving} saved={saved} onClick={save} /> : undefined}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Idioma" value={form.language} onChange={(v) => set("language", v)} disabled={!canEdit} />
        <Input label="Fuso horário" value={form.timezone} onChange={(v) => set("timezone", v)} disabled={!canEdit} />
        <Input label="Moeda" value={form.currency} onChange={(v) => set("currency", v)} disabled={!canEdit} />
        <Input label="Prefixo de documentos" value={form.documentPrefix} onChange={(v) => set("documentPrefix", v)} disabled={!canEdit} />
      </div>
    </SectionCard>
  );
}

/* ---------- Templates ---------- */

function TemplatesSection({ templates }: { templates: DocumentTemplate[] }) {
  return (
    <SectionCard title="Modelos de documento" icon={FileText} description="Editor de modelos será disponibilizado em sprint futura.">
      {templates.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum modelo cadastrado.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] -my-1">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.name}</div>
                <div className="text-caption">{DOCUMENT_KIND_LABEL[t.type]}</div>
              </div>
              {t.isDefault && <StatusChip tone="primary">Padrão</StatusChip>}
              {t.isSystem && <StatusChip tone="neutral">Sistema</StatusChip>}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ---------- Inputs ---------- */

function SaveButton({ saving, saved, onClick }: { saving: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={saving} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
      {saved ? "Salvo" : "Salvar"}
    </button>
  );
}

function Input({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)] disabled:opacity-60" />
    </label>
  );
}

function ColorInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-9 w-12 rounded border border-[var(--color-border)] bg-transparent disabled:opacity-60" aria-label={label} />
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm font-mono outline-none focus:border-[var(--color-primary)] disabled:opacity-60" />
      </div>
    </label>
  );
}
