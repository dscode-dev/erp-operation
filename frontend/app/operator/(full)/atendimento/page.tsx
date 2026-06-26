import { AtendimentoWizard } from "@operator/features/atendimento/atendimento-wizard";

export default async function AtendimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ equipmentId?: string; customerId?: string }>;
}) {
  const { equipmentId, customerId } = await searchParams;
  return <AtendimentoWizard initialEquipmentId={equipmentId} initialCustomerId={customerId} />;
}
