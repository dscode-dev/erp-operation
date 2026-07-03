import { redirect } from "next/navigation";

/**
 * Services are represented by the production Operation workflow in Orbit V1.
 * Keep this legacy route as a safe redirect instead of serving Demo Dataset UI.
 */
export default function ServicosPage() {
  redirect("/operacoes");
}
