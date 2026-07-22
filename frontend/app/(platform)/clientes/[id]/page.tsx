'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { CircleDollarSign, MapPin, Pencil, Plus, ReceiptText, Wrench } from 'lucide-react';
import { Breadcrumbs } from '@platform/components/breadcrumbs';
import { PageHeader } from '@platform/components/page-header';
import { InfoCard, InfoRow } from '@platform/components/info-card';
import { DataTable, type Column } from '@platform/components/data-table';
import { Pagination } from '@platform/components/pagination';
import { CustomerFormDrawer } from '@platform/components/customer-form-drawer';
import { EquipmentFormDrawer } from '@platform/components/equipment-form-drawer';
import { SaleFormDrawer } from '@platform/components/sale-form-drawer';
import { OperationDetailDrawer } from '@platform/components/operation-detail-drawer';
import { AsyncBoundary, ErrorState } from '@erp/ui/states';
import { EmptyState } from '@erp/ui/empty-state';
import { SkeletonCard, SkeletonList } from '@erp/ui/skeletons';
import { StatusPill } from '@erp/ui/status-pill';
import { Gate } from '@erp/ui/auth/gate';
import { useAuth } from '@erp/ui/auth/auth-provider';
import {
  customersApi,
  equipmentsApi,
  operationApi,
  salesApi,
  useQuery,
  type CustomerDetail,
  type EquipmentDetail,
  type EquipmentSummary,
  type OperationSummary,
  type Sale,
} from '@erp/api';
import { formatCurrencyBRL, formatDate, formatDateTime, maskCep } from '@erp/utils';

type Tab = 'overview' | 'equipment' | 'services' | 'sales';
const formatMoney = formatCurrencyBRL;

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [editingCustomer, setEditingCustomer] = useState(false);
  const detail = useQuery<CustomerDetail>(
    (signal) => customersApi.getCustomer(id, { signal }),
    [id],
  );
  return (
    <div className="max-w-[1400px] space-y-6">
      <Breadcrumbs
        items={[{ label: 'Clientes', href: '/clientes' }, { label: detail.data?.name ?? '…' }]}
      />
      <AsyncBoundary
        loading={detail.loading}
        error={detail.error}
        data={detail.data}
        onRetry={detail.refetch}
        skeleton={<SkeletonCard />}
      >
        {(customer) => (
          <>
            <PageHeader
              eyebrow={customer.type === 'COMPANY' ? 'Empresa' : 'Pessoa'}
              title={customer.name}
              description={customer.tradeName ?? customer.email ?? undefined}
              actions={
                <Gate roles={['OWNER', 'MANAGER']}>
                  <button className="btn-secondary" onClick={() => setEditingCustomer(true)}>
                    <Pencil className="h-4 w-4" />
                    Editar cliente
                  </button>
                </Gate>
              }
            />
            <nav
              className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)]"
              aria-label="Áreas do cliente"
            >
              {(
                [
                  ['overview', 'Visão geral'],
                  ['equipment', 'Equipamentos'],
                  ['services', 'Serviços'],
                  ...(hasRole('OWNER', 'MANAGER', 'VIEWER') ? [['sales', 'Vendas']] : []),
                ] as Array<[Tab, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === value ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'}`}
                >
                  {label}
                </button>
              ))}
            </nav>
            {tab === 'overview' && <Overview customer={customer} />}
            {tab === 'equipment' && <EquipmentTab customerId={id} />}
            {tab === 'services' && <ServicesTab customerId={id} />}
            {tab === 'sales' && <SalesTab customer={customer} />}
            <CustomerFormDrawer
              open={editingCustomer}
              onClose={() => setEditingCustomer(false)}
              onSaved={detail.refetch}
              customer={customer}
            />
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function Overview({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InfoCard title="Dados do cliente">
        <InfoRow
          label="Status"
          value={
            <StatusPill
              status={customer.isActive ? 'success' : 'offline'}
              label={customer.isActive ? 'Ativo' : 'Inativo'}
            />
          }
        />
        <InfoRow label="Documento" value={customer.cnpj ?? customer.cpf ?? '—'} />
        <InfoRow label="E-mail" value={customer.email ?? '—'} />
        <InfoRow label="Telefone" value={customer.phone ?? '—'} />
        <InfoRow label="Cadastro" value={formatDate(customer.createdAt)} />
      </InfoCard>
      <InfoCard title="Endereços">
        <div className="space-y-3">
          {customer.addresses.map((address) => (
            <div key={address.id} className="rounded-lg border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                {address.name}
                {address.isPrimary && (
                  <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                    PRINCIPAL
                  </span>
                )}
              </div>
              <p className="mt-1 text-caption">
                {[
                  address.street,
                  address.number,
                  address.district,
                  `${address.city}/${address.state}`,
                  address.zipCode ? `CEP ${maskCep(address.zipCode)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ))}
          {!customer.addresses.length && (
            <p className="text-caption">Nenhum endereço cadastrado.</p>
          )}
        </div>
      </InfoCard>
      <InfoCard title="Contatos">
        <div className="space-y-3">
          {customer.contacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border border-[var(--color-border)] p-3">
              <strong className="text-sm">{contact.name}</strong>
              <p className="text-caption">
                {[contact.role, contact.phone, contact.email].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
          {!customer.contacts.length && <p className="text-caption">Nenhum contato cadastrado.</p>}
        </div>
      </InfoCard>
    </div>
  );
}

function EquipmentTab({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentDetail | null>(null);
  const list = useQuery(
    (signal) => equipmentsApi.listEquipments({ customerId, page, limit, signal }),
    [customerId, page, limit],
  );
  const columns = useMemo<Column<EquipmentSummary>[]>(
    () => [
      {
        key: 'name',
        header: 'Equipamento',
        cell: (item) => (
          <div>
            <strong>{item.name}</strong>
            <p className="text-caption">
              {item.tag ?? item.serialNumber ?? 'Sem identificação auxiliar'}
            </p>
          </div>
        ),
      },
      {
        key: 'model',
        header: 'Modelo',
        cell: (item) =>
          [item.manufacturer, item.model, item.capacity].filter(Boolean).join(' · ') || '—',
      },
      {
        key: 'status',
        header: 'Status',
        cell: (item) => (
          <StatusPill
            status={
              item.status === 'ACTIVE'
                ? 'success'
                : item.status === 'MAINTENANCE'
                  ? 'warning'
                  : 'offline'
            }
            label={item.status}
          />
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-16',
        cell: (item) => (
          <Gate roles={['OWNER', 'MANAGER']}>
            <button
              className="rounded-md border border-[var(--color-border)] p-2"
              onClick={async (event) => {
                event.stopPropagation();
                setEditing(await equipmentsApi.getEquipment(item.id));
                setFormOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </Gate>
        ),
      },
    ],
    [],
  );
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Equipamentos do cliente</h2>
          <p className="text-caption">Cadastro, manutenção e acesso ao histórico de cada ativo.</p>
        </div>
        <Gate roles={['OWNER', 'MANAGER']}>
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Novo equipamento
          </button>
        </Gate>
      </div>
      {list.loading && !list.data ? (
        <SkeletonList rows={5} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data?.items.length ? (
        <>
          <DataTable
            columns={columns}
            rows={list.data.items}
            rowHref={(item) => `/equipamentos/${item.id}`}
          />
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        </>
      ) : (
        <EmptyState
          icon={Wrench}
          title="Nenhum equipamento"
          description="Cadastre o primeiro equipamento deste cliente."
        />
      )}
      <EquipmentFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={list.refetch}
        equipment={editing}
        presetCustomerId={customerId}
      />
    </section>
  );
}

function ServicesTab({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [operationId, setOperationId] = useState<string | null>(null);
  const list = useQuery(
    (signal) => operationApi.listOperations({ customerId, page, limit, signal }),
    [customerId, page, limit],
  );
  const columns: Column<OperationSummary>[] = [
    {
      key: 'number',
      header: 'Atendimento',
      cell: (item) => <strong>OS-{String(item.number).padStart(6, '0')}</strong>,
    },
    {
      key: 'document',
      header: 'Serviço / documento',
      cell: (item) => (
        <div>
          {item.requestedDocumentType}
          <p className="text-caption">{item.type}</p>
        </div>
      ),
    },
    {
      key: 'equipment',
      header: 'Equipamento',
      cell: (item) => item.equipment?.name ?? 'Sem equipamento específico',
    },
    { key: 'operator', header: 'Responsável', cell: (item) => item.operator?.name ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <StatusPill
          status={
            item.status === 'COMPLETED'
              ? 'success'
              : item.status === 'CANCELED'
                ? 'danger'
                : 'warning'
          }
          label={item.status}
        />
      ),
    },
    {
      key: 'date',
      header: 'Data',
      cell: (item) => formatDateTime(item.completedAt ?? item.scheduledFor ?? item.createdAt),
    },
  ];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Serviços registrados</h2>
        <p className="text-caption">
          Ordens de Serviço, visitas, laudos e demais atendimentos vinculados ao cliente.
        </p>
      </div>
      {list.loading && !list.data ? (
        <SkeletonList rows={5} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data?.items.length ? (
        <>
          <DataTable
            columns={columns}
            rows={list.data.items}
            onRowClick={(item) => setOperationId(item.id)}
          />
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        </>
      ) : (
        <EmptyState
          icon={ReceiptText}
          title="Nenhum serviço registrado"
          description="Os atendimentos do cliente aparecerão aqui."
        />
      )}
      <OperationDetailDrawer
        operationId={operationId}
        open={Boolean(operationId)}
        onClose={() => setOperationId(null)}
      />
    </section>
  );
}

function SalesTab({ customer }: { customer: CustomerDetail }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const list = useQuery(
    (signal) => salesApi.listSales({ customerId: customer.id, page, limit, signal }),
    [customer.id, page, limit],
  );
  const reload = () => list.refetch();
  const columns: Column<Sale>[] = [
    {
      key: 'number',
      header: 'Venda',
      cell: (item) => <strong>V-{String(item.number).padStart(6, '0')}</strong>,
    },
    { key: 'date', header: 'Data', cell: (item) => formatDate(item.soldAt) },
    {
      key: 'items',
      header: 'Itens',
      cell: (item) => (
        <div>
          {item.items.length} produto(s)
          <p className="text-caption truncate max-w-xs">
            {item.items.map((line) => line.description).join(', ')}
          </p>
        </div>
      ),
    },
    { key: 'total', header: 'Total', cell: (item) => formatMoney(Number(item.total)) },
    {
      key: 'warranty',
      header: 'Garantia',
      cell: (item) =>
        item.warrantyDays ? (
          <div>
            {item.warrantyDays} dias
            <p className="text-caption">até {formatDate(item.warrantyEndsAt)}</p>
          </div>
        ) : (
          'Sem garantia'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (item) => (
        <StatusPill
          status={
            item.status === 'COMPLETED'
              ? 'success'
              : item.status === 'CANCELED'
                ? 'danger'
                : 'warning'
          }
          label={item.status}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (item) => (
        <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
          {item.status === 'DRAFT' && (
            <Gate roles={['OWNER', 'MANAGER']}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditing(item);
                  setFormOpen(true);
                }}
              >
                Editar
              </button>
              <button
                className="btn-secondary"
                onClick={async () => {
                  await salesApi.completeSale(item.id);
                  reload();
                }}
              >
                Concluir
              </button>
            </Gate>
          )}
          {item.status === 'COMPLETED' && (
            <Link className="btn-secondary" href={`/reports?create=RECEIPT&saleId=${item.id}`}>
              Criar recibo
            </Link>
          )}
          {item.status !== 'CANCELED' && (
            <Gate roles={['OWNER', 'MANAGER']}>
              <button
                className="btn-secondary text-[var(--color-danger)]"
                onClick={async () => {
                  if (!window.confirm('Deseja realmente cancelar esta venda? O histórico será preservado.')) return;
                  await salesApi.cancelSale(item.id);
                  reload();
                }}
              >
                Cancelar
              </button>
            </Gate>
          )}
        </div>
      ),
    },
  ];
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vendas do cliente</h2>
          <p className="text-caption">
            Produtos, datas e cobertura de garantia preservados para emissão de recibos.
          </p>
        </div>
        <Gate roles={['OWNER', 'MANAGER']}>
          <button
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova venda
          </button>
        </Gate>
      </div>
      {list.loading && !list.data ? (
        <SkeletonList rows={5} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data?.items.length ? (
        <>
          <DataTable columns={columns} rows={list.data.items} />
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setLimit(value);
              setPage(1);
            }}
          />
        </>
      ) : (
        <EmptyState
          icon={CircleDollarSign}
          title="Nenhuma venda registrada"
          description="Registre produtos vendidos para controlar a garantia e emitir o recibo."
        />
      )}
      <SaleFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        customerId={customer.id}
        addresses={customer.addresses}
        sale={editing}
      />
    </section>
  );
}
