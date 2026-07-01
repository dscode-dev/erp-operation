"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { Pagination } from "@platform/components/pagination";
import { ExportButton } from "@platform/components/export-button";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyIllustration } from "@erp/ui/empty-illustration";
import { ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import { UserFormDrawer } from "@platform/components/user-form-drawer";
import { UserDetailDrawer } from "@platform/components/user-detail-drawer";
import { usersApi, useQuery, type Role, type TeamUser } from "@erp/api";
import { useDebounce } from "@erp/utils";
import { initials } from "@erp/utils";
import { ROLE_LABEL, ROLE_TONE, ROLES } from "@platform/user-display";

type StatusFilter = "all" | "active" | "inactive";

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [role, setRole] = useState<Role | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const debounced = useDebounce(search, 300);

  const [detail, setDetail] = useState<TeamUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamUser | null>(null);

  const list = useQuery(
    (signal) => usersApi.listUsers({ page, limit, search: debounced || undefined, signal }),
    [page, limit, debounced],
  );

  // Role/status filters are applied client-side over the current page.
  const rows = useMemo(() => {
    let items = list.data?.items ?? [];
    if (role) items = items.filter((u) => u.role === role);
    if (statusFilter !== "all") items = items.filter((u) => (statusFilter === "active" ? u.isActive : !u.isActive));
    return items;
  }, [list.data, role, statusFilter]);

  const columns = useMemo<Column<TeamUser>[]>(
    () => [
      {
        key: "name",
        header: "Usuário",
        sortAccessor: (u) => u.name.toLowerCase(),
        cell: (u) => (
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-8 w-8 rounded-full bg-[var(--color-accent)] grid place-items-center text-white text-[11px] font-semibold shrink-0">{initials(u.name)}</span>
            <div className="min-w-0">
              <div className="font-medium truncate">{u.name}</div>
              <div className="text-caption truncate">{u.email}</div>
            </div>
          </div>
        ),
      },
      { key: "role", header: "Papel", className: "w-[150px]", sortAccessor: (u) => u.role, cell: (u) => <StatusChip tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</StatusChip> },
      { key: "jobTitle", header: "Cargo", className: "w-[160px]", cell: (u) => <span className="text-sm">{u.jobTitle ?? "—"}</span> },
      { key: "status", header: "Status", className: "w-[130px]", sortAccessor: (u) => (u.isActive ? 1 : 0), cell: (u) => <StatusChip tone={u.isActive ? "success" : "neutral"} dot>{u.isActive ? "Ativo" : "Inativo"}</StatusChip> },
    ],
    [],
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Gestão"
        title="Usuários"
        description="Equipe da organização — papéis, permissões e acesso."
        actions={
          <Gate roles={["OWNER"]}>
            <button onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Plus className="h-4 w-4" /> Novo usuário
            </button>
          </Gate>
        }
      />

      <FilterBar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Buscar por nome, e-mail, usuário, telefone…"
        right={
          <ExportButton
            label="Exportar"
            fileName="usuarios"
            rows={rows.map((u) => ({ nome: u.name, email: u.email, usuario: u.username, papel: ROLE_LABEL[u.role], cargo: u.jobTitle ?? "", ativo: u.isActive ? "sim" : "não" }))}
          />
        }
      >
        <FilterChip active={role === ""} onClick={() => setRole("")}>Todos os papéis</FilterChip>
        {ROLES.map((r) => (
          <FilterChip key={r} active={role === r} onClick={() => setRole(r === role ? "" : r)}>{ROLE_LABEL[r]}</FilterChip>
        ))}
        <span className="mx-1 h-5 w-px bg-[var(--color-border)]" />
        <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>Todos</FilterChip>
        <FilterChip active={statusFilter === "active"} onClick={() => setStatusFilter("active")}>Ativos</FilterChip>
        <FilterChip active={statusFilter === "inactive"} onClick={() => setStatusFilter("inactive")}>Inativos</FilterChip>
      </FilterBar>

      {list.loading && !list.data ? (
        <SkeletonList rows={6} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : rows.length === 0 ? (
        <EmptyIllustration
          icon={Users}
          title={debounced || role || statusFilter !== "all" ? "Nenhum usuário encontrado" : "Nenhum usuário"}
          description={debounced || role || statusFilter !== "all" ? "Ajuste a busca e os filtros." : "Cadastre o primeiro usuário da equipe."}
        />
      ) : (
        <div className="space-y-3">
          <DataTable columns={columns} rows={rows} onRowClick={(u) => setDetail(u)} />
          {list.data && (
            <Pagination
              pagination={list.data.pagination}
              onPageChange={setPage}
              onPageSizeChange={(next) => { setLimit(next); setPage(1); }}
            />
          )}
        </div>
      )}

      <UserDetailDrawer
        user={detail}
        open={detail !== null}
        onClose={() => setDetail(null)}
        onChanged={() => { list.refetch(); }}
        onEdit={(u) => { setDetail(null); setEditing(u); setFormOpen(true); }}
      />
      <UserFormDrawer open={formOpen} onClose={() => setFormOpen(false)} onSaved={list.refetch} user={editing} />
    </div>
  );
}
