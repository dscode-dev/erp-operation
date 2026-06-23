import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { CommandPaletteProvider } from "@/components/shared/command-palette";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma Operacional",
  description: "Plataforma para empresas prestadoras de serviço.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CommandPaletteProvider>{children}</CommandPaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
