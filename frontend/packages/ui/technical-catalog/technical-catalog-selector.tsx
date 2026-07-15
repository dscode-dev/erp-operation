'use client';

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  technicalCatalogsApi,
  useQuery,
  type TechnicalCatalog,
  type TechnicalCatalogArea,
  type TechnicalCatalogType,
  type TechnicalCatalogWorkflow,
} from '@erp/api';
import { ErrorState } from '../states';

const CUSTOM_VALUE = '__custom__';

export function TechnicalCatalogSelector({
  type,
  label,
  values,
  onChange,
  compact = false,
  areas = ['GENERAL'],
  workflow = 'GENERAL',
}: {
  type: TechnicalCatalogType;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  compact?: boolean;
  areas?: TechnicalCatalogArea[];
  workflow?: TechnicalCatalogWorkflow;
}) {
  const [selection, setSelection] = useState('');
  const [custom, setCustom] = useState('');
  const [search, setSearch] = useState('');
  const areaKey = areas.join(',');
  const catalogs = useQuery(
    (signal) =>
      technicalCatalogsApi.list({
        type,
        active: true,
        areas,
        workflow,
        includeGeneral: true,
        search: search.trim() || undefined,
        page: 1,
        limit: 100,
        signal,
      }),
    [type, areaKey, workflow, search],
  );
  const items = useMemo(() => catalogs.data?.items ?? [], [catalogs.data?.items]);
  const available = useMemo(
    () => items.filter((item) => !values.includes(item.title)),
    [items, values],
  );

  function add() {
    if (!selection) return;
    if (selection === CUSTOM_VALUE) {
      const text = custom.trim();
      if (!text || values.includes(text)) return;
      onChange([...values, text]);
      setCustom('');
      setSelection('');
      return;
    }
    const item = items.find((candidate) => candidate.id === selection);
    if (item && !values.includes(item.title)) onChange([...values, item.title]);
    setSelection('');
  }

  return (
    <section className={compact ? 'space-y-2' : 'space-y-3'}>
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={`Pesquisar ${label.toLowerCase()} por texto ou tag`}
        aria-label={`Pesquisar ${label.toLowerCase()}`}
        className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <select
          aria-label={label}
          value={selection}
          onChange={(event) => setSelection(event.target.value)}
          className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
        >
          <option value="">Selecionar {label.toLowerCase()}…</option>
          {available.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>Outros…</option>
        </select>
        <button
          type="button"
          onClick={add}
          disabled={!selection || (selection === CUSTOM_VALUE && !custom.trim())}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>
      {selection === CUSTOM_VALUE && (
        <input
          autoFocus
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          placeholder={`Descreva ${label.toLowerCase()}`}
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
        />
      )}
      {catalogs.error && <ErrorState error={catalogs.error} onRetry={catalogs.refetch} />}
      <TechnicalCatalogList catalog={items} values={values} onChange={onChange} />
    </section>
  );
}

export function TechnicalCatalogList({
  catalog,
  values,
  onChange,
}: {
  catalog: TechnicalCatalog[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  if (values.length === 0) {
    return <p className="text-caption">Nenhum item adicionado.</p>;
  }
  return (
    <ol className="space-y-2">
      {values.map((value, index) => {
        const custom = !catalog.some((item) => item.title === value);
        return (
          <li
            key={`${value}-${index}`}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-2"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-muted)] text-xs font-semibold">
              {index + 1}
            </span>
            {custom ? (
              <input
                value={value}
                aria-label={`Editar item personalizado ${index + 1}`}
                onChange={(event) =>
                  onChange(
                    values.map((current, currentIndex) =>
                      currentIndex === index ? event.target.value : current,
                    ),
                  )
                }
                className="h-8 min-w-0 rounded border border-[var(--color-border)] bg-transparent px-2 text-sm"
              />
            ) : (
              <span className="text-sm">{value}</span>
            )}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Mover para cima"
                className="p-1.5 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === values.length - 1}
                aria-label="Mover para baixo"
                className="p-1.5 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, current) => current !== index))}
                aria-label="Remover item"
                className="p-1.5 text-[var(--color-danger)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
