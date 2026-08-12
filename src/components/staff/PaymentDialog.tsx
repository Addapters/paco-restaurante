"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  registarPagamentoEEmitirFatura,
  type ResultadoPagamento,
} from "@/app/actions/faturacao";
import type { MetodoPagamento } from "@/lib/invoicing/types";
import { Button, Card, CardTitle } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffOrder } from "./StaffDashboard";

const METODOS: MetodoPagamento[] = ["dinheiro", "multibanco_tpa", "parceiro"];

// Registo do pagamento de um pedido: o método é apenas informativo
// (o pagamento real acontece no TPA físico) e no fim é emitida a
// fatura via InvoiceProvider.
export function PaymentDialog({
  order,
  onClose,
  onPaid,
}: {
  order: StaffOrder;
  onClose(): void;
  onPaid(orderId: string, resultado: ResultadoPagamento): void;
}) {
  const t = useTranslations("StaffPanel.pagamento");
  const locale = useLocale() as Locale;
  const [metodo, setMetodo] = useState<MetodoPagamento>("multibanco_tpa");
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPagamento | null>(null);

  const total = order.order_items.reduce(
    (s, i) => s + (i.e_oferta ? 0 : i.preco_unitario * i.quantidade),
    0
  );

  async function confirmar() {
    if (busy) return;
    setBusy(true);
    const res = await registarPagamentoEEmitirFatura(order.id, metodo);
    setBusy(false);
    setResultado(res);
    if (res.ok) onPaid(order.id, res);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md">
        {resultado?.ok ? (
          <div className="text-center">
            <CardTitle>✓ {t("pagoTitle")}</CardTitle>
            {resultado.numeroFatura ? (
              <p className="mt-2 text-sm text-smoke">
                {t("faturaEmitida", { numero: resultado.numeroFatura })}
              </p>
            ) : (
              <p className="mt-2 text-sm font-medium text-terracotta-dark">
                {t("faturaFalhou")}
              </p>
            )}
            <div className="mt-4 flex justify-center gap-3">
              {resultado.faturaUrl && (
                <Link href={resultado.faturaUrl} target="_blank">
                  <Button variant="secondary">{t("verFatura")}</Button>
                </Link>
              )}
              <Button onClick={onClose}>{t("fechar")}</Button>
            </div>
          </div>
        ) : (
          <>
            <CardTitle>
              {t("title", {
                mesa: order.restaurant_tables?.numero ?? "—",
              })}
            </CardTitle>
            <p className="mt-1 text-sm text-smoke">{t("nota")}</p>

            <p className="mt-4 text-2xl font-bold text-ink">
              {formatPrice(total, locale)}
            </p>

            <div className="mt-4 space-y-2">
              {METODOS.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                    metodo === m
                      ? "border-terracotta bg-terracotta/10 font-medium text-ink"
                      : "border-ink/15 text-ink hover:bg-ink/5"
                  )}
                >
                  <input
                    type="radio"
                    name="metodo"
                    value={m}
                    checked={metodo === m}
                    onChange={() => setMetodo(m)}
                    className="accent-terracotta"
                  />
                  {t(`metodos.${m}`)}
                </label>
              ))}
            </div>

            {resultado && !resultado.ok && (
              <p className="mt-3 text-sm font-medium text-terracotta-dark">
                {t("erro")}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                {t("cancelar")}
              </Button>
              <Button onClick={confirmar} disabled={busy}>
                {busy ? t("aConfirmar") : t("confirmar")}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
