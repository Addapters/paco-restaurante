"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { useMesaOrders, type OrderEstado } from "./MesaOrdersProvider";
import { EstadoBadge } from "@/components/EstadoBadge";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ItemDaMesa {
  id: string;
  quantidade: number;
  lugar_numero: number | null;
  e_oferta: boolean;
  nome_pt: string;
  nome_en: string;
  estado: OrderEstado;
}

interface PedidoRpc {
  id: string;
  estado: OrderEstado;
  criado_em: string;
  itens: Omit<ItemDaMesa, "estado">[];
}

// Vista só de leitura da própria mesa: lugares 1..capacidade com os
// itens pedidos e o estado. Os dados vêm da RPC pedidos_da_mesa, que
// usa o qr_token como chave de acesso — nunca expõe outras mesas.
export function MesaSeatsView() {
  const { mesa, orders, lugar } = useMesaOrders();
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("Pedido.mesaView");
  const locale = useLocale() as Locale;
  const [itens, setItens] = useState<ItemDaMesa[]>([]);

  const carregar = useCallback(async () => {
    const { data } = await supabase.rpc("pedidos_da_mesa", {
      p_qr_token: mesa.qrToken,
    });
    const pedidos = (data as PedidoRpc[] | null) ?? [];
    setItens(
      pedidos.flatMap((p) =>
        (p.itens ?? []).map((i) => ({ ...i, estado: p.estado }))
      )
    );
  }, [supabase, mesa.qrToken]);

  // Recarrega quando os pedidos da sessão mudam (novo pedido ou
  // mudança de estado via Realtime) e periodicamente, para apanhar
  // pedidos de outros lugares da mesa.
  useEffect(() => {
    // Fetch legítimo: o setState acontece após o await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
    const timer = setInterval(carregar, 30_000);
    return () => clearInterval(timer);
  }, [carregar, orders]);

  const porLugar = useMemo(() => {
    const mapa = new Map<number | null, ItemDaMesa[]>();
    for (const item of itens) {
      const chave =
        item.lugar_numero != null && item.lugar_numero <= mesa.capacidade
          ? item.lugar_numero
          : null;
      mapa.set(chave, [...(mapa.get(chave) ?? []), item]);
    }
    return mapa;
  }, [itens, mesa.capacidade]);

  if (itens.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-ink">
        {t("titulo", { numero: mesa.numero })}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: mesa.capacidade }, (_, i) => i + 1).map((n) => {
          const doLugar = porLugar.get(n) ?? [];
          return (
            <Card
              key={n}
              className={cn(
                "p-4",
                lugar === n && "border-sage ring-1 ring-sage/40"
              )}
            >
              <p className="text-sm font-semibold text-ink">
                {t("lugarN", { n })}
                {lugar === n && (
                  <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-xs font-medium text-white">
                    {t("oTeuLugar")}
                  </span>
                )}
              </p>
              {doLugar.length === 0 ? (
                <p className="mt-2 text-sm text-smoke">{t("semItens")}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {doLugar.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-sm text-ink"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.quantidade}×{" "}
                        {locale === "pt" ? item.nome_pt : item.nome_en}
                        {item.e_oferta && " 🎁"}
                      </span>
                      <EstadoBadge estado={item.estado} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
        {(porLugar.get(null) ?? []).length > 0 && (
          <Card className="p-4">
            <p className="text-sm font-semibold text-smoke">{t("semLugar")}</p>
            <ul className="mt-2 space-y-1.5">
              {(porLugar.get(null) ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-sm text-ink"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.quantidade}×{" "}
                    {locale === "pt" ? item.nome_pt : item.nome_en}
                  </span>
                  <EstadoBadge estado={item.estado} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}
