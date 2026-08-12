"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { useMesaOrders } from "./MesaOrdersProvider";
import { Card } from "@/components/ui";
import { EstadoBadge } from "@/components/EstadoBadge";
import { formatPrice } from "@/lib/format";

// Histórico dos pedidos desta mesa/sessão; o estado atualiza em tempo
// real (Supabase Realtime) quando o staff o muda.
export function OrdersHistory() {
  const { orders } = useMesaOrders();
  const t = useTranslations("Pedido");
  const locale = useLocale() as Locale;

  if (orders.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-ink">{t("historico")}</h2>
      <div className="space-y-4">
        {orders.map((order) => {
          const total = order.order_items.reduce(
            (sum, i) => sum + (i.e_oferta ? 0 : i.preco_unitario * i.quantidade),
            0
          );
          return (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-smoke">
                  {new Date(order.criado_em).toLocaleTimeString(
                    locale === "pt" ? "pt-PT" : "en-GB",
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
                <EstadoBadge estado={order.estado} />
              </div>
              <ul className="mt-3 space-y-1">
                {order.order_items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between gap-3 text-sm text-ink"
                  >
                    <span>
                      {item.quantidade}×{" "}
                      {item.menu_items
                        ? locale === "pt"
                          ? item.menu_items.nome_pt
                          : item.menu_items.nome_en
                        : "—"}
                      {item.e_oferta && (
                        <span className="ml-2 rounded-full bg-sage/15 px-2 py-0.5 text-xs font-medium text-sage-dark">
                          {t("oferta")}
                        </span>
                      )}
                    </span>
                    <span className="text-smoke">
                      {item.e_oferta
                        ? "—"
                        : formatPrice(item.preco_unitario * item.quantidade, locale)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-ink/10 pt-2 text-right text-sm font-bold text-ink">
                {t("total")}: {formatPrice(total, locale)}
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
