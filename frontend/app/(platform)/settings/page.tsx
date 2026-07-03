"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Check, Upload, FileText, Image as ImageIcon, Palette, Building2, SlidersHorizontal, PenLine, Trash2, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonCard } from "@erp/ui/skeletons";
import { AsyncBoundary } from "@erp/ui/states";
import { useAuth, applyBranding } from "@erp/ui/auth/auth-provider";
import {
  organizationApi,
  documentsApi,
  signaturesApi,
  useQuery,
  ApiClientError,
  type BrandAssetType,
  type DocumentConfiguration,
  type DocumentTemplate,
  type Organization,
  type OrganizationSettings,
  type Signature,
} from "@erp/api";
import { DOCUMENT_KIND_LABEL } from "@erp/types";

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("OWNER");

  const org = useQuery<Organization>((signal) => organizationApi.getOrganization({ signal }), []);
  const settings = useQuery<OrganizationSettings>((signal) => organizationApi.getOrganizationSettings({ signal }), []);
  const templates = useQuery<DocumentTemplate[]>((signal) => organizationApi.listTemplates({ signal }), []);
  const documentConfig = useQuery<DocumentConfiguration[]>((signal) => documentsApi.listConfiguration({ signal }), []);
  const signatures = useQuery((signal) => signaturesApi.listSignatures({ limit: 100, signal }), []);

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

      <AsyncBoundary loading={documentConfig.loading} error={documentConfig.error} data={documentConfig.data} onRetry={documentConfig.refetch} skeleton={<SkeletonCard />}>
        {(data) => <DocumentConfigurationSection configurations={data} />}
      </AsyncBoundary>

      <AsyncBoundary loading={signatures.loading} error={signatures.error} data={signatures.data} onRetry={signatures.refetch} skeleton={<SkeletonCard />}>
        {(data) => <SignaturesSection signatures={data.items} canEdit={canEdit} onChanged={signatures.refetch} />}
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

const primaryBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const secondaryBtn =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-muted)]";

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
      <div className="relative h-24 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] grid place-items-center bg-[var(--color-muted)]/30 overflow-hidden">
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
          : preview ? <Image src={preview} alt={label} fill sizes="180px" unoptimized className="object-contain" />
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
  const { refresh } = useAuth();
  const [form, setForm] = useState(org);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(org), [org]);
  function set<K extends keyof Organization>(k: K, v: Organization[K]) { setForm((f) => ({ ...f, [k]: v })); }

  // Live branding preview while editing brand colors.
  function setColor(key: "primaryColor" | "secondaryColor", value: string) {
    set(key, value);
    applyBranding(
      key === "primaryColor" ? value : form.primaryColor,
      key === "secondaryColor" ? value : form.secondaryColor,
    );
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await organizationApi.updateOrganization({
        legalName: form.legalName, tradeName: form.tradeName, cnpj: form.cnpj, email: form.email,
        phone: form.phone, city: form.city, state: form.state,
        primaryColor: form.primaryColor, secondaryColor: form.secondaryColor,
      });
      applyBranding(form.primaryColor, form.secondaryColor);
      onSaved();
      // Re-bootstrap the session so the persisted colors apply app-wide.
      await refresh();
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
        <ColorInput label="Cor primária" value={form.primaryColor} onChange={(v) => setColor("primaryColor", v)} disabled={!canEdit} />
        <ColorInput label="Cor secundária" value={form.secondaryColor} onChange={(v) => setColor("secondaryColor", v)} disabled={!canEdit} />
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
              <StatusChip tone={t.requiresSignature ? "info" : "neutral"}>{signatureModeLabel(t.signatureMode)}</StatusChip>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function RowText({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-caption">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function signatureModeLabel(mode: DocumentTemplate["signatureMode"]): string {
  const labels: Record<DocumentTemplate["signatureMode"], string> = {
    NONE: "Sem assinatura",
    FIXED: "Assinatura fixa",
    COLLECTED: "Coletada",
    HYBRID: "Híbrida",
  };
  return labels[mode];
}

function SmallAction({
  icon: Icon,
  label,
  onClick,
  busy,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 text-xs disabled:opacity-50 ${
        danger
          ? "border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />} {label}
    </button>
  );
}

function DocumentConfigurationSection({ configurations }: { configurations: DocumentConfiguration[] }) {
  return (
    <SectionCard title="Documentos" icon={FileText} description="Configuração real consumida de /documents/configuration. Layout visual ainda não é editável.">
      <div className="grid gap-3 md:grid-cols-2">
        {configurations.map((config) => (
          <div key={config.type} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{DOCUMENT_KIND_LABEL[config.type]}</h3>
                <p className="text-caption">{config.templates.length} template(s) ativo(s)</p>
              </div>
              {config.defaultTemplate && <StatusChip tone="primary">Padrão</StatusChip>}
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <RowText label="Template padrão" value={config.defaultTemplate?.name ?? "—"} />
              <RowText label="Assinatura" value={config.defaultTemplate ? signatureModeLabel(config.defaultTemplate.signatureMode) : "—"} />
              <RowText label="Obrigatória" value={config.defaultTemplate?.requiresSignature ? "Sim" : "Não"} />
              <RowText label="Assinatura fixa" value={config.defaultTemplate?.signature?.name ?? "—"} />
              <RowText label="Componentes" value="Header · Footer · Sections · Signature placeholder" />
            </dl>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SignaturesSection({ signatures, canEdit, onChanged }: { signatures: Signature[]; canEdit: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState<Signature | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(signature: Signature) {
    setBusy(signature.id); setError(null);
    try {
      await signaturesApi.updateSignature(signature.id, { active: !signature.active });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao atualizar assinatura.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(signature: Signature) {
    setBusy(signature.id); setError(null);
    try {
      await signaturesApi.deleteSignature(signature.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao remover assinatura.");
    } finally {
      setBusy(null);
    }
  }

  async function download(signature: Signature) {
    setBusy(signature.id); setError(null);
    try {
      const image = await signaturesApi.downloadSignatureImage(signature.id);
      const binary = atob(image.contentBase64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: image.mimeType ?? "image/png" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = image.originalFileName ?? `${image.name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Imagem de assinatura indisponível.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <SectionCard
      title="Assinaturas"
      icon={PenLine}
      description="Assinaturas fixas reutilizáveis por templates. Imagens ficam no storage do backend."
      action={canEdit ? <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>Nova assinatura</button> : <StatusChip tone="info">Somente leitura</StatusChip>}
    >
      {error && <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
      {signatures.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">Nenhuma assinatura cadastrada.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {signatures.map((signature) => (
            <li key={signature.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><PenLine className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{signature.name}</div>
                  <div className="text-caption truncate">{signature.title}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusChip tone={signature.active ? "success" : "neutral"} dot>{signature.active ? "Ativa" : "Inativa"}</StatusChip>
                    <StatusChip tone={signature.imageStorageKey ? "info" : "neutral"}>{signature.imageStorageKey ? "Imagem enviada" : "Sem imagem"}</StatusChip>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <SmallAction icon={Download} label="Download" busy={busy === signature.id} onClick={() => download(signature)} />
                {canEdit && (
                  <>
                    <SmallAction icon={PenLine} label="Editar" onClick={() => setEditing(signature)} />
                    <SmallAction icon={Check} label={signature.active ? "Desativar" : "Ativar"} busy={busy === signature.id} onClick={() => toggle(signature)} />
                    <SmallAction icon={Trash2} label="Excluir" danger busy={busy === signature.id} onClick={() => remove(signature)} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <SignatureEditor open={creating || editing !== null} signature={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); onChanged(); }} />
    </SectionCard>
  );
}

function SignatureEditor({ open, signature, onClose, onSaved }: { open: boolean; signature: Signature | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [active, setActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(signature?.name ?? "");
    setTitle(signature?.title ?? "");
    setActive(signature?.active ?? true);
    setFile(null);
    setError(null);
  }, [open, signature]);

  if (!open) return null;

  async function save() {
    if (!name.trim() || !title.trim()) { setError("Informe nome e título."); return; }
    setSaving(true); setError(null);
    try {
      const saved = signature
        ? await signaturesApi.updateSignature(signature.id, { name, title, active })
        : await signaturesApi.createSignature({ name, title, active });
      if (file) await signaturesApi.uploadSignatureImage(saved.id, file);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Falha ao salvar assinatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
        <h3 className="font-semibold">{signature ? "Editar assinatura" : "Nova assinatura"}</h3>
        {error && <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        <div className="mt-4 space-y-3">
          <Input label="Nome" value={name} onChange={setName} />
          <Input label="Título" value={title} onChange={setTitle} />
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-medium">Ativa</span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Imagem da assinatura</span>
            <input type="file" accept="image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm" />
            <span className="text-caption">PNG/JPG/JPEG · até 2 MiB.</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancelar</button>
          <button type="button" onClick={save} disabled={saving} className={primaryBtn}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</button>
        </div>
      </div>
    </div>
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
