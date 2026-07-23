'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiClientError, customersApi, type CustomerContact } from '@erp/api';
import { Drawer } from '@erp/ui/drawer';

type ContactForm = {
  name: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
  isPrimary: boolean;
};

const emptyForm: ContactForm = {
  name: '',
  role: '',
  phone: '',
  email: '',
  notes: '',
  isPrimary: false,
};

function contactForm(contact: CustomerContact | null): ContactForm {
  return contact
    ? {
        name: contact.name,
        role: contact.role ?? '',
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        notes: contact.notes ?? '',
        isPrimary: contact.isPrimary,
      }
    : emptyForm;
}

export function CustomerContactFormDrawer({
  open,
  customerId,
  contact,
  onClose,
  onSaved,
}: {
  open: boolean;
  customerId: string;
  contact: CustomerContact | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ContactForm>(contactForm(contact));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(contactForm(contact));
    setSaving(false);
    setError(null);
  }, [contact, open]);

  function set<K extends keyof ContactForm>(key: K, value: ContactForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (form.name.trim().length < 2) {
      setError('Informe o nome do contato.');
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError('Informe pelo menos um telefone ou e-mail.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      notes: form.notes.trim() || null,
      isPrimary: form.isPrimary,
    };
    try {
      if (contact) await customersApi.updateContact(customerId, contact.id, payload);
      else await customersApi.createContact(customerId, payload);
      onSaved();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof ApiClientError ? cause.message : 'Não foi possível salvar o contato.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Cliente"
      title={contact ? 'Editar contato' : 'Novo contato'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {contact ? 'Salvar alterações' : 'Adicionar contato'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-caption">
          Cadastre a pessoa responsável pelo atendimento, manutenção ou área administrativa.
        </p>
        {error && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
        <Field label="Nome" required>
          <input
            value={form.name}
            maxLength={150}
            autoFocus
            onChange={(event) => set('name', event.target.value)}
          />
        </Field>
        <Field label="Cargo ou função">
          <input
            value={form.role}
            maxLength={100}
            placeholder="Ex.: Gestor de manutenção"
            onChange={(event) => set('role', event.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone">
            <input
              value={form.phone}
              maxLength={30}
              inputMode="tel"
              placeholder="(81) 99999-9999"
              onChange={(event) => set('phone', event.target.value)}
            />
          </Field>
          <Field label="E-mail">
            <input
              value={form.email}
              maxLength={254}
              type="email"
              placeholder="contato@empresa.com"
              onChange={(event) => set('email', event.target.value)}
            />
          </Field>
        </div>
        <Field label="Observações">
          <textarea
            value={form.notes}
            maxLength={2000}
            className="min-h-24"
            onChange={(event) => set('notes', event.target.value)}
          />
        </Field>
        <label className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
          <input
            type="checkbox"
            checked={form.isPrimary}
            onChange={(event) => set('isPrimary', event.target.checked)}
          />
          Contato principal deste cliente
        </label>
      </div>
    </Drawer>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>
        {label}
        {required && <span className="text-[var(--color-danger)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
