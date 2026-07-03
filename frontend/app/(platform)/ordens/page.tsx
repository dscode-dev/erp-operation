import { redirect } from "next/navigation";

/**
 * Work Orders are accessed through production Operations and Document Engine in V1.
 * Keep this legacy route as a safe redirect instead of serving Demo Dataset UI.
 */
export default function OrdensPage() {
  redirect("/operacoes");
}
