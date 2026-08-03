"use client";

import { ExecucaoWizard } from "@operator/features/execucao/execucao-wizard";
import { Drawer } from "@erp/ui/drawer";

export function RvtExecutionDrawer({
  assignmentId,
  onClose,
  onCompleted,
}: {
  assignmentId: string | null;
  onClose: () => void;
  onCompleted: () => void;
}) {
  return (
    <Drawer
      open={assignmentId !== null}
      onClose={onClose}
      eyebrow="Execução na Platform"
      title="Executar Relatório de Visita Técnica"
      width="max-w-[1100px]"
      contentClassName="overflow-hidden p-0"
    >
      {assignmentId ? (
        <ExecucaoWizard
          assignmentId={assignmentId}
          surface="platform"
          onClose={onClose}
          onCompleted={onCompleted}
        />
      ) : null}
    </Drawer>
  );
}
