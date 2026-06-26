import { QrCode } from "lucide-react";
import { ComingSoonState } from "@erp/ui/states";

/**
 * Leitura de QR do operador. A resolução de scan público (qrToken → equipamento)
 * é escopo futuro do backend. Esta rota existe para que a navegação inferior
 * funcione e a arquitetura de QR (ver components/platform/qr-foundation) esteja
 * disponível no app do operador.
 */
export default function OperatorQrPage() {
  return (
    <div className="px-4 pt-6 space-y-4">
      <header className="flex items-center gap-2">
        <QrCode className="h-5 w-5" />
        <h1 className="text-section-title">Escanear QR</h1>
      </header>
      <ComingSoonState
        title="Leitura de QR em breve"
        description="A resolução de scan (QR do equipamento → ficha) depende de um endpoint público do backend, ainda em escopo futuro."
      />
    </div>
  );
}
