import { redirect } from 'next/navigation';

export default async function EquipamentosPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  redirect(customerId ? `/clientes/${customerId}` : '/clientes');
}
