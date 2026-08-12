"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMesaOrders, type AlertTipo } from "./MesaOrdersProvider";
import { Button } from "@/components/ui";

const COOLDOWN_MS = 30_000;

// "Chamar Colaborador" / "Pedir Conta": cada clique cria um table_alert
// pendente, que aparece instantaneamente na vista do staff (Realtime).
export function TableActions() {
  const { sendAlert } = useMesaOrders();
  const t = useTranslations("Pedido");
  const [busy, setBusy] = useState<AlertTipo | null>(null);
  const [sent, setSent] = useState<Partial<Record<AlertTipo, boolean>>>({});
  const [error, setError] = useState(false);

  async function handle(tipo: AlertTipo) {
    if (busy || sent[tipo]) return;
    setBusy(tipo);
    setError(false);
    const ok = await sendAlert(tipo);
    setBusy(null);
    if (!ok) {
      setError(true);
      return;
    }
    setSent((prev) => ({ ...prev, [tipo]: true }));
    setTimeout(() => setSent((prev) => ({ ...prev, [tipo]: false })), COOLDOWN_MS);
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={busy === "chamar_staff" || sent.chamar_staff}
          onClick={() => handle("chamar_staff")}
        >
          {sent.chamar_staff ? `✓ ${t("staffChamado")}` : t("chamarStaff")}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy === "pedir_conta" || sent.pedir_conta}
          onClick={() => handle("pedir_conta")}
        >
          {sent.pedir_conta ? `✓ ${t("contaPedida")}` : t("pedirConta")}
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-terracotta-dark">
          {t("alertaErro")}
        </p>
      )}
    </div>
  );
}
