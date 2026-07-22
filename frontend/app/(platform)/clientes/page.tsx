'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Users, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@platform/components/page-header';
import { DataTable, type Column } from '@platform/components/data-table';
import { Pagination } from '@platform/components/pagination';
import { StatusPill } from '@erp/ui/status-pill';
import { SkeletonList } from '@erp/ui/skeletons';
import { EmptyState } from '@erp/ui/empty-state';
import { ErrorState } from '@erp/ui/states';
import { Gate } from '@erp/ui/auth/gate';
import { CustomerFormDrawer } from '@platform/components/customer-form-drawer';
import { customersApi, useQuery, type Customer } from '@erp/api';
import { useDebounce } from '@erp/utils';

export default function ClientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const debounced = useDebounce(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const list = useQuery(
    (signal) => customersApi.listCustomers({ page, limit, search: debounced || undefined, signal }),
    [page, limit, debounced],
  );
  const stats = useQuery((signal) => customersApi.getCustomerStats({ signal }), []);

  const columns = useMemo<Column<Customer>[]>(
    () => [
      {
        key: 'name',
        header: 'Cliente',
        cell: (c) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{c.name}</div>
            <div className="text-caption truncate">{c.tradeName ?? c.email ?? c.phone ?? '—'}</div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Tipo',
        className: 'w-[120px]',
        cell: (c) => (
          <span className="text-[11px] uppercase tracking-wider rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[var(--color-muted-foreground)]">
            {c.type === 'COMPANY' ? 'Empresa' : 'Pessoa'}
          </span>
        ),
      },
      {
        key: 'doc',
        header: 'Documento',
        className: 'w-[180px]',
        cell: (c) => <span className="font-mono text-xs">{c.cnpj ?? c.cpf ?? '—'}</span>,
      },
      {
        key: 'phone',
        header: 'Contato',
        className: 'w-[170px]',
        cell: (c) => <span className="text-sm truncate">{c.phone ?? c.email ?? '—'}</span>,
      },
      {
        key: 'counts',
        header: 'Vínculos',
        className: 'w-[140px]',
        cell: (c) => (
          <span className="text-caption">
            {c._count ? `${c._count.addresses} end · ${c._count.contacts} cont` : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        className: 'w-[120px]',
        cell: (c) => (
          <StatusPill
            status={c.isActive ? 'success' : 'offline'}
            label={c.isActive ? 'Ativo' : 'Inativo'}
          />
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-[64px]',
        cell: (c) => (
          <Gate roles={['OWNER', 'MANAGER']}>
            <button
              type="button"
              aria-label={`Editar ${c.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setEditing(c);
                setFormOpen(true);
              }}
              className="rounded-md border border-[var(--color-border)] p-2 hover:bg-[var(--color-muted)]"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </Gate>
        ),
      },
    ],
    [],
  );

  function reload() {
    list.refetch();
    stats.refetch();
  }

  const s = stats.data;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        description="Carteira ativa consumida diretamente da API."
        actions={
          <Gate roles={['OWNER', 'MANAGER']}>
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]"
            >
              <Plus className="h-4 w-4" /> Novo cliente
            </button>
          </Gate>
        }
      />

      {/* Stats */}
      {s && (
        <div className="flex flex-wrap gap-2 text-caption">
          <Chip label="Total" value={s.total} />
          <Chip label="Ativos" value={s.active} />
          <Chip label="Inativos" value={s.inactive} />
          <Chip label="Empresas" value={s.companies} />
          <Chip label="Pessoas" value={s.people} />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 w-full max-w-[360px]">
        <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome, documento, telefone ou e-mail…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-muted-foreground)]"
        />
      </div>

      {/* List */}
      {list.loading && !list.data ? (
        <SkeletonList rows={6} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={debounced ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={
            debounced
              ? 'Ajuste a busca e tente novamente.'
              : 'Cadastre o primeiro cliente para começar.'
          }
        />
      ) : list.data ? (
        <div className="space-y-3">
          <DataTable
            columns={columns}
            rows={list.data.items}
            onRowClick={(c) => router.push(`/clientes/${c.id}`)}
          />
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </div>
      ) : null}

      {/* Drawers */}
      <CustomerFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        customer={editing}
      />
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1">
      <span className="text-[var(--color-muted-foreground)]">{label}</span>
      <span className="font-medium text-[var(--color-foreground)] tabular-nums">{value}</span>
    </span>
  );
}
