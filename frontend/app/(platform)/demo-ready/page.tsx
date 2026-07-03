import { redirect } from "next/navigation";

/**
 * Commercial demo mode was a development aid. Orbit V1 uses the Executive
 * Dashboard as the production command center, so stale demo links land there.
 */
export default function DemoReadyPage() {
  redirect("/");
}
