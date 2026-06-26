import type { MetadataRoute } from "next";

/**
 * PWA manifest. The installable app is the ERP Operator (field app), so
 * `start_url` points to /operator. Blue/white corporate identity.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERP Operador — Campo",
    short_name: "ERP Operador",
    description: "Aplicativo de campo para operadores: agenda, atendimentos, QR e assinatura.",
    start_url: "/operator",
    scope: "/operator",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1769d6",
    icons: [
      { src: "/icons/operator-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/operator-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
