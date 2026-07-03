import { redirect } from "next/navigation";

/**
 * Work Order details are accessed through OperationDetailDrawer/Documents in V1.
 * Preserve stale route safety without showing a non-functional placeholder.
 */
export default function OrdemDetailPage() {
  redirect("/ordens");
}
