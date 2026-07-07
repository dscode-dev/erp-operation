import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@erp/ui/theme/theme-provider";
import { AppProviders } from "./app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP Operation ",
  description: "Plataforma de gestão e operação de campo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};  

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
