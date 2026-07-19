"use client";

import { use } from "react";
import { ExecucaoWizard } from "@operator/features/execucao/execucao-wizard";

export default function ExecucaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExecucaoWizard assignmentId={id} />;
}
