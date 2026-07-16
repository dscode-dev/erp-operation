"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  LibraryBig,
  Plus,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { Pagination } from "@platform/components/pagination";
import { TemplateFormDrawer } from "@platform/components/template-form-drawer";
import { organizationApi, signaturesApi, useQuery, type DocumentTemplate, type DocumentTemplateType, type Signature } from "@erp/api";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { Gate } from "@erp/ui/auth/gate";
import { ConfirmDialog } from "@erp/ui/confirm-dialog";
import { Drawer } from "@erp/ui/drawer";
import { EmptyState } from "@erp/ui/empty-state";
import { SkeletonCard } from "@erp/ui/skeletons";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { MODEL_BLUEPRINTS, type ModelKey } from "@erp/ui/documents/model-blueprints";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDate } from "@erp/utils";

type TemplateCard = {
  key: ModelKey;
  label: string;
  description: string;
  type: DocumentTemplateType;
  template: DocumentTemplate | null;
};

const ICONS: Record<ModelKey, LucideIcon> = {
  OS: ClipboardCheck,
  RELATORIO_TECNICO: FileText,
  PMOC: ShieldCheck,
  LAUDO: ScrollText,
  ORCAMENTO: LibraryBig,
  RECIBO: ReceiptText,
};

const SIGNATURE_MODE_LABEL: Record<string, string> = {
  NONE: "Sem assinatura",
  FIXED: "Assinatura fixa",
  COLLECTED: "Coletada em campo",
  HYBRID: "Híbrida",
};

const cardPageSizeOptions = [6, 12, 24];

export default function ReportTemplatesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("OWNER");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [editing, setEditing] = useState<TemplateCard | null>(null);
  const [previewing, setPreviewing] = useState<TemplateCard | null>(null);
  const [creatingType, setCreatingType] = useState<DocumentTemplateType>("WORK_ORDER");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentTemplate | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const templates = useQuery<DocumentTemplate[]>((signal) => organizationApi.listTemplates({ signal }), []);
  const signatures = useQuery((signal) => signaturesApi.listSignatures({ page: 1, limit: 100, signal }), []);

  const cards = useMemo(() => {
    const all = templates.data ?? [];
    return MODEL_BLUEPRINTS.map<TemplateCard>((blueprint) => ({
      key: blueprint.key,
      label: blueprint.label,
      description: blueprint.description,
      type: blueprint.templateType,
      template: defaultTemplate(all, blueprint.templateType),
    }));
  }, [templates.data]);

  const pagedCards = cards.slice((page - 1) * limit, page * limit);
  const meta = pageMeta(page, limit, cards.length);
  const signatureList = signatures.data?.items ?? [];

  function saved(message: string) {
    templates.refetch();
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

  async function deleteTemplate(template: DocumentTemplate) {
    await organizationApi.deleteTemplate(template.id);
    setPreviewing(null);
    setDeleteTarget(null);
    saved("Modelo removido com segurança.");
  }

  return (
    <Gate
      permission="canReports"
      fallback={<div className="max-w-[1200px]"><PageHeader eyebrow="Documentos" title="Modelos de Documentos" description="Acesso restrito." /></div>}
    >
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentos"
        title="Modelos de Documentos"
        description="Biblioteca profissional dos modelos usados na emissão dos documentos oficiais."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={creatingType}
              onChange={(event) => setCreatingType(event.target.value as DocumentTemplateType)}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              aria-label="Tipo do novo modelo"
            >
              {uniqueTemplateTypes().map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_KIND_LABEL[type]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!canEdit}
              title={!canEdit ? "Somente OWNER pode criar modelos." : undefined}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Plus className="h-4 w-4" />
              Novo Modelo
            </button>
          </div>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      {templates.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : templates.error ? (
        <EmptyState
          icon={RefreshCw}
          title="Não foi possível carregar os modelos"
          description={templates.error instanceof Error ? templates.error.message : "Falha ao buscar modelos."}
          action={
            <button type="button" onClick={templates.refetch} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]">
              Tentar novamente
            </button>
          }
        />
      ) : cards.length === 0 ? (
        <EmptyState icon={LibraryBig} title="Nenhum modelo disponível" description="A biblioteca será exibida assim que os modelos oficiais forem cadastrados." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedCards.map((card) => (
              <TemplateModelCard
                key={card.key}
                card={card}
                canEdit={canEdit}
                signature={findSignature(signatureList, card.template?.signatureId)}
                onModelPreview={() => setPreviewing(card)}
                onConfigure={() => setEditing(card)}
              />
            ))}
          </div>
          <Pagination
            pagination={meta}
            pageSizeOptions={cardPageSizeOptions}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        </div>
      )}

      <TemplatePreviewDrawer
        state={previewing}
        canEdit={canEdit}
        signature={findSignature(signatureList, previewing?.template?.signatureId)}
        onClose={() => setPreviewing(null)}
        onConfigure={() => {
          if (!previewing) return;
          setEditing(previewing);
          setPreviewing(null);
        }}
        onDelete={(template) => setDeleteTarget(template)}
      />

      {editing && (
        <TemplateFormDrawer
          open
          onClose={() => setEditing(null)}
          onSaved={() => saved("Modelo salvo com sucesso.")}
          type={editing.type}
          typeLabel={editing.label}
          template={editing.template}
        />
      )}

      <TemplateFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => saved("Novo modelo criado com sucesso.")}
        type={creatingType}
        typeLabel={DOCUMENT_KIND_LABEL[creatingType]}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remover modelo?"
        description="Modelos obrigatórios do sistema não podem ser removidos."
        confirmLabel="Remover"
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteTemplate(deleteTarget);
        }}
      />
    </div>
    </Gate>
  );
}

function TemplateModelCard({
  card,
  canEdit,
  signature,
  onModelPreview,
  onConfigure,
}: {
  card: TemplateCard;
  canEdit: boolean;
  signature: Signature | null;
  onModelPreview: () => void;
  onConfigure: () => void;
}) {
  const Icon = ICONS[card.key] ?? FileText;
  const template = card.template;
  const active = template?.isActive ?? false;

  return (
    <article className="group rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition duration-200 hover:border-[var(--color-primary)]/35 hover:bg-[var(--color-muted)]/20">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 text-[var(--color-muted-foreground)] transition group-hover:border-[var(--color-primary)]/30 group-hover:text-[var(--color-primary)]">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{template?.name || card.label}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{card.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge tone={active ? "success" : "muted"}>{active ? "Ativo" : "Inativo"}</Badge>
        <Badge tone={template?.requiresSignature ? "info" : "muted"}>
          {template?.requiresSignature ? "Ass. obrigatória" : "Ass. opcional"}
        </Badge>
        <Badge tone={signature ? "primary" : "muted"}>
          {signature ? `Fixa · ${signature.name}` : SIGNATURE_MODE_LABEL[template?.signatureMode ?? "NONE"]}
        </Badge>
        {template?.isDefault && <Badge tone="primary">Padrão</Badge>}
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <Meta label="Tipo" value={DOCUMENT_KIND_LABEL[card.type]} />
        <Meta label="Atualizado" value={template?.updatedAt ? formatDate(template.updatedAt) : "Ainda não configurado"} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <button type="button" onClick={onModelPreview} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 text-xs font-medium transition hover:bg-[var(--color-muted)]">
          <Eye className="h-4 w-4" />
          Modelo
        </button>
        <button
          type="button"
          onClick={onConfigure}
          disabled={!canEdit}
          title={!canEdit ? "Somente OWNER pode configurar modelos." : undefined}
          className="ml-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-2.5 text-xs font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Settings2 className="h-4 w-4" />
          Configurar
        </button>
      </div>
    </article>
  );
}

function TemplatePreviewDrawer({
  state,
  canEdit,
  signature,
  onClose,
  onConfigure,
  onDelete,
}: {
  state: TemplateCard | null;
  canEdit: boolean;
  signature: Signature | null;
  onClose: () => void;
  onConfigure: () => void;
  onDelete: (template: DocumentTemplate) => void;
}) {
  const card = state;
  const template = card?.template ?? null;

  return (
    <Drawer
      open={Boolean(card)}
      onClose={onClose}
      eyebrow="Preview de modelo"
      title={card ? `Modelo · ${card.label}` : "Modelo"}
      width="max-w-[1280px]"
    >
      {card && (
        <div className="space-y-5">
          <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-caption uppercase tracking-wider">Inspeção estrutural · {DOCUMENT_KIND_LABEL[card.type]}</p>
                  <h3 className="truncate text-lg font-semibold">{template?.name ?? card.label}</h3>
                  <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted-foreground)]">{card.description}</p>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge tone={template?.isActive ? "success" : "muted"}>{template?.isActive ? "Ativo" : "Inativo"}</Badge>
                <Badge tone={template?.isDefault ? "primary" : "muted"}>{template?.isDefault ? "Padrão" : "Não padrão"}</Badge>
                <Badge tone={template?.requiresSignature ? "info" : "muted"}>{template?.requiresSignature ? "Assinatura obrigatória" : "Assinatura opcional"}</Badge>
                <Badge tone={signature ? "primary" : "muted"}>{signature ? `Fixa: ${signature.name}` : SIGNATURE_MODE_LABEL[template?.signatureMode ?? "NONE"]}</Badge>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              <Meta label="Cabeçalho" value={template?.headerContent || "—"} block />
              <Meta label="Rodapé" value={template?.footerContent || "—"} block />
              <Meta label="Observações" value={template?.observations || "—"} block />
              <Meta label="Atualizado em" value={template?.updatedAt ? formatDate(template.updatedAt) : "—"} />
            </dl>

            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm text-[var(--color-muted-foreground)]">
              Este preview mostra apenas estrutura, placeholders oficiais e configurações visuais. Emissões com dados reais pertencem à Central de Relatórios.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onConfigure}
                disabled={!canEdit}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Settings2 className="h-4 w-4" />
                Configurar
              </button>
              {template && canEdit && !template.isSystem && (
                <button
                  type="button"
                  onClick={() => onDelete(template)}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 px-3 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            {template ? (
              <DocumentViewer
                source={{ templateId: template.id }}
                title={`Modelo · ${card.label}`}
                canRender={false}
                canDownload={false}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Template indisponível"
                description="Crie ou configure um modelo antes de solicitar o preview estrutural."
              />
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

function defaultTemplate(templates: DocumentTemplate[], type: DocumentTemplateType) {
  const candidates = templates.filter((template) => template.type === type);
  return candidates.find((template) => template.isDefault) ?? candidates[0] ?? null;
}

function findSignature(signatures: Signature[], id?: string | null) {
  if (!id) return null;
  return signatures.find((signature) => signature.id === id) ?? null;
}

function uniqueTemplateTypes() {
  return Array.from(new Set(MODEL_BLUEPRINTS.map((blueprint) => blueprint.templateType)));
}

function pageMeta(page: number, limit: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page: Math.min(page, totalPages), limit, total, totalPages };
}

function Meta({ label, value, block = false }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? "space-y-1" : "flex items-start justify-between gap-3"}>
      <dt className="shrink-0 text-[var(--color-muted-foreground)]">{label}</dt>
      <dd className={`${block ? "text-left" : "text-right"} break-words font-medium`}>{value}</dd>
    </div>
  );
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "success" | "info" | "primary" }) {
  const cls =
    tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "info"
        ? "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : tone === "primary"
          ? "border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}
