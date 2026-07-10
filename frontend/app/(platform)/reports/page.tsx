"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileSignature,
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
import { operationApi, organizationApi, signaturesApi, useQuery, type DocumentTemplate, type DocumentTemplateType, type OperationSummary, type Signature } from "@erp/api";
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
  VISITA_TECNICA: FileSignature,
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

export default function ReportsPage() {
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
  const operations = useQuery((signal) => operationApi.listOperations({ page: 1, limit: 25, signal }), []);

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
        description="Biblioteca profissional dos modelos usados pelo Document Engine. A emissão e o PDF continuam sob responsabilidade exclusiva do backend."
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
        <EmptyState icon={LibraryBig} title="Nenhum modelo disponível" description="A biblioteca será exibida assim que os modelos oficiais existirem no backend." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pagedCards.map((card) => (
              <TemplateModelCard
                key={card.key}
                card={card}
                canEdit={canEdit}
                signature={findSignature(signatureList, card.template?.signatureId)}
                onPreview={() => setPreviewing(card)}
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
        card={previewing}
        canEdit={canEdit}
        signature={findSignature(signatureList, previewing?.template?.signatureId)}
        operations={operations.data?.items ?? []}
        operationsLoading={operations.loading}
        onRendered={() => {
          operations.refetch();
          saved("Documento emitido pelo Document Engine.");
        }}
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
        description="Esta ação usa o endpoint oficial de templates e respeita as proteções do backend. Modelos de sistema não podem ser removidos."
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
  onPreview,
  onConfigure,
}: {
  card: TemplateCard;
  canEdit: boolean;
  signature: Signature | null;
  onPreview: () => void;
  onConfigure: () => void;
}) {
  const Icon = ICONS[card.key] ?? FileText;
  const template = card.template;
  const active = template?.isActive ?? false;

  return (
    <article className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-floating)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--color-primary)]/80 via-[var(--color-secondary)]/60 to-transparent opacity-70" />
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] transition group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{template?.name || card.label}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{card.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={active ? "success" : "muted"}>{active ? "Ativo" : "Inativo"}</Badge>
        <Badge tone={template?.requiresSignature ? "info" : "muted"}>
          {template?.requiresSignature ? "Assinatura obrigatória" : "Assinatura opcional"}
        </Badge>
        <Badge tone={template?.signatureMode === "FIXED" || template?.signatureMode === "HYBRID" ? "primary" : "muted"}>
          {signature ? `Fixa: ${signature.name}` : SIGNATURE_MODE_LABEL[template?.signatureMode ?? "NONE"]}
        </Badge>
        {template?.isDefault && <Badge tone="primary">Template padrão</Badge>}
      </div>

      <dl className="mt-5 grid gap-2 text-sm">
        <Meta label="Tipo" value={DOCUMENT_KIND_LABEL[card.type]} />
        <Meta label="Atualizado" value={template?.updatedAt ? formatDate(template.updatedAt) : "Ainda não configurado"} />
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={onPreview} className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium transition hover:bg-[var(--color-muted)]">
          <Eye className="h-4 w-4" />
          Visualizar
        </button>
        <button
          type="button"
          onClick={onConfigure}
          disabled={!canEdit}
          title={!canEdit ? "Somente OWNER pode configurar modelos." : undefined}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-foreground)] px-3 text-sm font-medium text-[var(--color-background)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Settings2 className="h-4 w-4" />
          Configurar
        </button>
      </div>
    </article>
  );
}

function TemplatePreviewDrawer({
  card,
  canEdit,
  signature,
  operations,
  operationsLoading,
  onRendered,
  onClose,
  onConfigure,
  onDelete,
}: {
  card: TemplateCard | null;
  canEdit: boolean;
  signature: Signature | null;
  operations: OperationSummary[];
  operationsLoading: boolean;
  onRendered: () => void;
  onClose: () => void;
  onConfigure: () => void;
  onDelete: (template: DocumentTemplate) => void;
}) {
  const template = card?.template ?? null;
  const [operationId, setOperationId] = useState("");
  const selectedOperation = operations.find((operation) => operation.id === operationId) ?? operations[0] ?? null;

  useEffect(() => {
    if (!card) return;
    setOperationId((current) => current || operations[0]?.id || "");
  }, [card, operations]);

  return (
    <Drawer open={Boolean(card)} onClose={onClose} eyebrow="Preview oficial" title={card ? `Modelo · ${card.label}` : "Modelo"} width="max-w-[1280px]">
      {card && (
        <div className="space-y-5">
          <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-caption uppercase tracking-wider">{DOCUMENT_KIND_LABEL[card.type]}</p>
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

          <section className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Fonte real do preview</h3>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  Selecione uma Operation real. Preview, renderização e download usam `/documents/operations/:operationId/:type`.
                </p>
              </div>
              <select
                value={selectedOperation?.id ?? ""}
                onChange={(event) => setOperationId(event.target.value)}
                disabled={operationsLoading || operations.length === 0}
                className="h-9 min-w-[280px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
                aria-label="Operation para preview oficial"
              >
                {operations.length === 0 ? (
                  <option value="">Nenhuma Operation disponível</option>
                ) : (
                  operations.map((operation) => (
                    <option key={operation.id} value={operation.id}>
                      OP-{String(operation.number).padStart(6, "0")} · {operation.customer?.name ?? "Cliente"} · {operation.equipment?.name ?? "sem equipamento"}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedOperation && (
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <Meta label="Cliente" value={selectedOperation.customer?.name ?? "—"} />
                <Meta label="Equipamento" value={selectedOperation.equipment?.name ?? "—"} />
                <Meta label="Operador" value={selectedOperation.operator?.name ?? "—"} />
                <Meta label="Status" value={selectedOperation.status} />
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            {selectedOperation ? (
              <DocumentViewer
                source={{ operationId: selectedOperation.id, type: card.type }}
                title={`${card.label} · OP-${String(selectedOperation.number).padStart(6, "0")}`}
                canRender={Boolean(template)}
                canDownload={Boolean(template)}
                onRendered={onRendered}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="Nenhuma Operation disponível"
                description="Crie uma Operation real para pré-visualizar, emitir e baixar este tipo documental pelo Document Engine."
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
