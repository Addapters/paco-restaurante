"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { EstadoBadge, type OrderEstado } from "@/components/EstadoBadge";
import { NewOrderForm } from "./NewOrderForm";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export type AlertTipo = "chamar_staff" | "pedir_conta";
export type OrderOrigem =
  | "mesa"
  | "uber_informativo"
  | "thefork_informativo"
  | "outro";

export interface Mesa {
  id: string;
  numero: number;
}

interface TableAlert {
  id: string;
  mesa_id: string;
  tipo: AlertTipo;
  estado: "pendente" | "atendido";
  criado_em: string;
}

export interface StaffOrder {
  id: string;
  mesa_id: string | null;
  origem: OrderOrigem;
  estado: OrderEstado;
  criado_em: string;
  restaurant_tables: { numero: number } | null;
  order_items: {
    id: string;
    quantidade: number;
    preco_unitario: number;
    e_oferta: boolean;
    menu_items: { nome_pt: string; nome_en: string } | null;
  }[];
}

const ORDER_SELECT =
  "id, mesa_id, origem, estado, criado_em, restaurant_tables(numero), order_items(id, quantidade, preco_unitario, e_oferta, menu_items(nome_pt, nome_en))";

const PROXIMO_ESTADO: Partial<Record<OrderEstado, OrderEstado>> = {
  pendente: "em_preparacao",
  em_preparacao: "servido",
  servido: "pago",
};

const ESTADOS: OrderEstado[] = ["pendente", "em_preparacao", "servido", "pago"];

function horaDe(iso: string, locale: Locale) {
  return new Date(iso).toLocaleTimeString(locale === "pt" ? "pt-PT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StaffDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("StaffPanel");
  const locale = useLocale() as Locale;

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [alerts, setAlerts] = useState<TableAlert[]>([]);
  const [orders, setOrders] = useState<StaffOrder[]>([]);

  const fetchOrderById = useCallback(
    async (id: string): Promise<StaffOrder | null> => {
      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .eq("id", id)
        .maybeSingle();
      return data as unknown as StaffOrder | null;
    },
    [supabase]
  );

  // Carga inicial
  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: a }, { data: o }] = await Promise.all([
        supabase.from("restaurant_tables").select("id, numero").order("numero"),
        supabase
          .from("table_alerts")
          .select("id, mesa_id, tipo, estado, criado_em")
          .eq("estado", "pendente")
          .order("criado_em"),
        supabase
          .from("orders")
          .select(ORDER_SELECT)
          .order("criado_em", { ascending: false })
          .limit(50),
      ]);
      setMesas((m as Mesa[]) ?? []);
      setAlerts((a as TableAlert[]) ?? []);
      setOrders((o as unknown as StaffOrder[]) ?? []);
    })();
  }, [supabase]);

  // Realtime: novos pedidos, mudanças de estado e alertas de mesa
  useEffect(() => {
    const channel = supabase
      .channel("staff-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const novo = await fetchOrderById((payload.new as { id: string }).id);
          if (novo) {
            setOrders((prev) =>
              prev.some((o) => o.id === novo.id) ? prev : [novo, ...prev]
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const upd = payload.new as { id: string; estado: OrderEstado };
          setOrders((prev) =>
            prev.map((o) => (o.id === upd.id ? { ...o, estado: upd.estado } : o))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "table_alerts" },
        (payload) => {
          const alerta = payload.new as TableAlert;
          if (alerta.estado === "pendente") {
            setAlerts((prev) =>
              prev.some((a) => a.id === alerta.id) ? prev : [...prev, alerta]
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "table_alerts" },
        (payload) => {
          const alerta = payload.new as TableAlert;
          setAlerts((prev) =>
            alerta.estado === "pendente"
              ? prev
              : prev.filter((a) => a.id !== alerta.id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrderById]);

  async function marcarAtendido(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId)); // otimista
    await supabase
      .from("table_alerts")
      .update({ estado: "atendido" })
      .eq("id", alertId);
  }

  async function avancarEstado(order: StaffOrder) {
    const proximo = PROXIMO_ESTADO[order.estado];
    if (!proximo) return;
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, estado: proximo } : o))
    );
    const { error } = await supabase
      .from("orders")
      .update({ estado: proximo })
      .eq("id", order.id);
    if (error) {
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, estado: order.estado } : o))
      );
    }
  }

  // Estado de cada mesa: alerta pendente > ocupada (pedido ativo) > livre
  const mesaEstado = useMemo(() => {
    const ocupadas = new Set(
      orders
        .filter((o) => o.estado !== "pago" && o.mesa_id)
        .map((o) => o.mesa_id as string)
    );
    const comAlerta = new Set(alerts.map((a) => a.mesa_id));
    return new Map(
      mesas.map((m) => [
        m.id,
        comAlerta.has(m.id)
          ? ("alerta" as const)
          : ocupadas.has(m.id)
            ? ("ocupada" as const)
            : ("livre" as const),
      ])
    );
  }, [mesas, orders, alerts]);

  const numeroDaMesa = useMemo(
    () => new Map(mesas.map((m) => [m.id, m.numero])),
    [mesas]
  );

  return (
    <div className="space-y-10">
      {/* 1. Vista geral das mesas */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">{t("mesas.title")}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {mesas.map((mesa) => {
            const estado = mesaEstado.get(mesa.id) ?? "livre";
            return (
              <div
                key={mesa.id}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 p-3 text-center",
                  estado === "livre" && "border-ink/15 bg-paper text-smoke",
                  estado === "ocupada" && "border-sage bg-sage/15 text-sage-dark",
                  estado === "alerta" &&
                    "animate-pulse border-terracotta bg-terracotta/20 text-terracotta-dark"
                )}
              >
                <span className="text-lg font-bold">{mesa.numero}</span>
                <span className="text-xs font-medium">
                  {t(`mesas.${estado}`)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Painel de alertas */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">
          {t("alertas.title")}
          {alerts.length > 0 && (
            <span className="ml-2 rounded-full bg-terracotta px-2.5 py-0.5 text-sm text-white">
              {alerts.length}
            </span>
          )}
        </h2>
        {alerts.length === 0 ? (
          <p className="text-smoke">{t("alertas.semAlertas")}</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alerta) => (
              <Card
                key={alerta.id}
                className="flex items-center justify-between gap-4 border-terracotta p-4"
              >
                <div>
                  <p className="font-semibold text-ink">
                    {alerta.tipo === "chamar_staff" ? "🛎" : "🧾"}{" "}
                    {t("mesas.mesa", {
                      numero: numeroDaMesa.get(alerta.mesa_id) ?? "?",
                    })}{" "}
                    — {t(`alertas.${alerta.tipo}`)}
                  </p>
                  <p className="text-sm text-smoke">
                    {horaDe(alerta.criado_em, locale)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => marcarAtendido(alerta.id)}
                >
                  ✓ {t("alertas.atendido")}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 3. Novo pedido pelo staff */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">
          {t("novoPedido.title")}
        </h2>
        <NewOrderForm mesas={mesas} />
      </section>

      {/* 4. Pedidos por estado */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">
          {t("pedidos.title")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ESTADOS.map((estado) => {
            const doEstado = orders.filter((o) => o.estado === estado);
            return (
              <div key={estado} className="space-y-3">
                <div className="flex items-center gap-2">
                  <EstadoBadge estado={estado} />
                  <span className="text-sm text-smoke">{doEstado.length}</span>
                </div>
                {doEstado.map((order) => {
                  const total = order.order_items.reduce(
                    (s, i) =>
                      s + (i.e_oferta ? 0 : i.preco_unitario * i.quantidade),
                    0
                  );
                  const proximo = PROXIMO_ESTADO[order.estado];
                  return (
                    <Card key={order.id} className="p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-ink">
                          {order.restaurant_tables
                            ? t("mesas.mesa", {
                                numero: order.restaurant_tables.numero,
                              })
                            : t(`novoPedido.origens.${order.origem}`)}
                        </span>
                        <span className="text-xs text-smoke">
                          {horaDe(order.criado_em, locale)}
                        </span>
                      </div>
                      {order.restaurant_tables && order.origem !== "mesa" && (
                        <span className="text-xs text-smoke">
                          {t(`novoPedido.origens.${order.origem}`)}
                        </span>
                      )}
                      <ul className="mt-2 space-y-0.5 text-sm text-ink">
                        {order.order_items.map((item) => (
                          <li key={item.id}>
                            {item.quantidade}×{" "}
                            {item.menu_items
                              ? locale === "pt"
                                ? item.menu_items.nome_pt
                                : item.menu_items.nome_en
                              : "—"}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink/10 pt-2">
                        <span className="text-sm font-bold text-ink">
                          {formatPrice(total, locale)}
                        </span>
                        {proximo && (
                          <Button size="sm" onClick={() => avancarEstado(order)}>
                            {t(`pedidos.acao.${proximo}`)} →
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
