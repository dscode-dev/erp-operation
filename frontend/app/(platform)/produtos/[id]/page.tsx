import { redirect } from "next/navigation";

/**
 * Product detail is represented by the Products drawer/list in Orbit V1.
 * Keep the route safe for stale links without exposing a dead placeholder.
 */
export default function ProdutoDetailPage() {
  redirect("/produtos");
}
