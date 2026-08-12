"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { EstadoBadge, type OrderEstado } from "@/components/EstadoBadge";
import { NewOrderForm } from "./NewOrderForm";
import { PaymentDialog } from "./PaymentDialog";
import { FloorPlan, type MesaEstadoVisual } from "./FloorPlan";
import { MesaDetailPanel } from "./MesaDetailPanel";
import { Link } from "@/i18n/navigation";
import type { ResultadoPagamento } from "@/app/actions/faturacao";
import { formatPrice } from "@/lib/format";

export type AlertTipo = "chamar_staff" | "pedir_conta";
export type OrderOrigem =
  | "mesa"
  | "uber_informativo"
  | "thefork_informativo"
  | "outro";

export interface Mesa {
  id: string;
  numero: number;
  capacidade: number;
  sala: "salao" | "terraco";
  pos_x: number;
  pos_y: number;
  forma: "redonda" | "retangular";
  staff_responsavel_id: string | null;
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
    motivo_oferta: string | null;
    lugar_numero: number | null;
    menu_items: { nome_pt: string; nome_en: string } | null;
  }[];
}

interface InvoiceRef {
  numero_fatura: string;
  url: string | null;
}

const ORDER_SELECT =
  "id, mesa_id, origem, estado, criado_em, restaurant_tables(numero), order_items(id, quantidade, preco_unitario, e_oferta, motivo_oferta, lugar_numero, menu_items(nome_pt, nome_en))";

const MESA_SELECT =
  "id, numero, capacidade, sala, pos_x, pos_y, forma, staff_responsavel_id";

// "servido → pago" passa pelo diálogo de pagamento (método + fatura),
// não pelo avanço direto de estado.
const PROXIMO_ESTADO: Partial<Record<OrderEstado, OrderEstado>> = {
  pendente: "em_preparacao",
  em_preparacao: "servido",
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
  const [invoices, setInvoices] = useState<Map<string, InvoiceRef>>(new Map());
  const [pagamentoDe, setPagamentoDe] = useState<StaffOrder | null>(null);
  const [nomeDoStaff, setNomeDoStaff] = useState<Map<string, string>>(
    new Map()
  );
  const [meuId, setMeuId] = useState<string | null>(null);
  const [mesaSelecionada, setMesaSelecionada] = useState<string | null>(null);
  // Item em marcação de oferta: pede o motivo antes de gravar
  const [ofertaDe, setOfertaDe] = useState<{
    orderId: string;
    itemId: string;
  } | null>(null);
  const [motivoOferta, setMotivoOferta] = useState("");

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMeuId(user?.id ?? null);

      const [{ data: m }, { data: a }, { data: o }, { data: inv }, { data: st }] =
        await Promise.all([
          supabase
            .from("restaurant_tables")
            .select(MESA_SELECT)
            .order("numero"),
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
          supabase
            .from("invoices")
            .select("order_id, numero_fatura, url")
            .order("criado_em", { ascending: false })
            .limit(100),
          supabase
            .from("profiles")
            .select("id, nome")
            .in("role", ["staff", "admin"]),
        ]);
      setMesas((m as Mesa[]) ?? []);
      setNomeDoStaff(
        new Map(
          ((st as { id: string; nome: string }[]) ?? []).map((p) => [
            p.id,
            p.nome,
          ])
        )
      );
      setAlerts((a as TableAlert[]) ?? []);
      setOrders((o as unknown as StaffOrder[]) ?? []);
      setInvoices(
        new Map(
          (
            (inv as { order_id: string; numero_fatura: string; url: string | null }[]) ??
            []
          ).map((i) => [
            i.order_id,
            { numero_fatura: i.numero_fatura, url: i.url },
          ])
        )
      );
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurant_tables" },
        (payload) => {
          // Assumir/libertar mesa propaga a todos os ecrãs de staff
          const upd = payload.new as Mesa;
          setMesas((prev) =>
            prev.map((m) => (m.id === upd.id ? { ...m, ...upd } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrderById]);

  async function atribuirMesa(mesaId: string, assumir: boolean) {
    const { error } = await supabase.rpc("atribuir_mesa", {
      p_mesa_id: mesaId,
      p_assumir: assumir,
    });
    if (!error) {
      setMesas((prev) =>
        prev.map((m) =>
          m.id === mesaId
            ? { ...m, staff_responsavel_id: assumir ? meuId : null }
            : m
        )
      );
    }
    return !error;
  }

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

  function onPago(orderId: string, resultado: ResultadoPagamento) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, estado: "pago" } : o))
    );
    if (resultado.numeroFatura) {
      setInvoices((prev) =>
        new Map(prev).set(orderId, {
          numero_fatura: resultado.numeroFatura!,
          url: resultado.faturaUrl ?? null,
        })
      );
    }
  }

  async function marcarOferta(orderId: string, itemId: string, motivo: string) {
    const patch = { e_oferta: true, motivo_oferta: motivo || null };
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              order_items: o.order_items.map((i) =>
                i.id === itemId ? { ...i, ...patch } : i
              ),
            }
          : o
      )
    );
    setOfertaDe(null);
    setMotivoOferta("");
    await supabase.from("order_items").update(patch).eq("id", itemId);
  }

  async function desmarcarOferta(orderId: string, itemId: string) {
    const patch = { e_oferta: false, motivo_oferta: null };
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              order_items: o.order_items.map((i) =>
                i.id === itemId ? { ...i, ...patch } : i
              ),
            }
          : o
      )
    );
    await supabase.from("order_items").update(patch).eq("id", itemId);
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
      {/* 1. Planta da sala */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">{t("mesas.title")}</h2>
        <FloorPlan
          mesas={mesas}
          estadoDe={mesaEstado as Map<string, MesaEstadoVisual>}
          selecionada={mesaSelecionada}
          onSelect={(id) =>
            setMesaSelecionada((atual) => (atual === id ? null : id))
          }
          nomeDoStaff={nomeDoStaff}
        />
        {mesaSelecionada &&
          (() => {
            const mesa = mesas.find((m) => m.id === mesaSelecionada);
            if (!mesa) return null;
            return (
              <div className="mt-4">
                <MesaDetailPanel
                  mesa={mesa}
                  orders={orders}
                  nomeDoStaff={nomeDoStaff}
                  meuId={meuId}
                  onAtribuir={atribuirMesa}
                  onAvancar={avancarEstado}
                  onFechar={() => setMesaSelecionada(null)}
                />
              </div>
            );
          })()}
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
                      <ul className="mt-2 space-y-1 text-sm text-ink">
                        {order.order_items.map((item) => {
                          const emEdicao =
                            ofertaDe?.orderId === order.id &&
                            ofertaDe?.itemId === item.id;
                          return (
                            <li key={item.id}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="min-w-0 flex-1 truncate">
                                  {item.quantidade}×{" "}
                                  {item.menu_items
                                    ? locale === "pt"
                                      ? item.menu_items.nome_pt
                                      : item.menu_items.nome_en
                                    : "—"}
                                </span>
                                {item.e_oferta ? (
                                  <span className="flex shrink-0 items-center gap-1 text-xs">
                                    <s className="text-smoke">
                                      {formatPrice(
                                        item.preco_unitario * item.quantidade,
                                        locale
                                      )}
                                    </s>
                                    <span className="font-semibold text-sage-dark">
                                      {formatPrice(0, locale)}
                                    </span>
                                    {estado !== "pago" && (
                                      <button
                                        className="text-smoke hover:text-ink"
                                        title={t("ofertas.desmarcar")}
                                        onClick={() =>
                                          desmarcarOferta(order.id, item.id)
                                        }
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </span>
                                ) : (
                                  estado !== "pago" && (
                                    <button
                                      className="shrink-0 text-xs font-medium text-sage-dark opacity-60 underline-offset-2 hover:opacity-100 hover:underline"
                                      title={t("ofertas.marcar")}
                                      onClick={() => {
                                        setOfertaDe({
                                          orderId: order.id,
                                          itemId: item.id,
                                        });
                                        setMotivoOferta("");
                                      }}
                                    >
                                      {t("ofertas.rotulo")}
                                    </button>
                                  )
                                )}
                              </div>
                              {item.e_oferta && item.motivo_oferta && (
                                <p className="text-xs text-smoke">
                                  {t("ofertas.rotulo")}: {item.motivo_oferta}
                                </p>
                              )}
                              {emEdicao && (
                                <div className="mt-1 flex items-center gap-2">
                                  <input
                                    autoFocus
                                    value={motivoOferta}
                                    onChange={(e) =>
                                      setMotivoOferta(e.target.value)
                                    }
                                    placeholder={t("ofertas.motivo")}
                                    className="h-8 min-w-0 flex-1 rounded-lg border border-ink/20 bg-paper px-2 text-xs text-ink placeholder:text-smoke focus:border-terracotta focus:outline-none"
                                  />
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      marcarOferta(
                                        order.id,
                                        item.id,
                                        motivoOferta
                                      )
                                    }
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setOfertaDe(null)}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink/10 pt-2">
                        <span className="text-sm font-bold text-ink">
                          {formatPrice(total, locale)}
                        </span>
                        {proximo && (
                          <Button size="sm" onClick={() => avancarEstado(order)}>
                            {t(`pedidos.acao.${proximo}`)} →
                          </Button>
                        )}
                        {estado === "servido" && (
                          <Button size="sm" onClick={() => setPagamentoDe(order)}>
                            {t("pedidos.acao.pago")} →
                          </Button>
                        )}
                        {estado === "pago" &&
                          (() => {
                            const inv = invoices.get(order.id);
                            if (!inv) return null;
                            return inv.url ? (
                              <Link
                                href={inv.url}
                                target="_blank"
                                className="text-xs font-medium text-sage-dark underline-offset-2 hover:underline"
                              >
                                {inv.numero_fatura}
                              </Link>
                            ) : (
                              <span className="text-xs text-smoke">
                                {inv.numero_fatura}
                              </span>
                            );
                          })()}
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {pagamentoDe && (
        <PaymentDialog
          order={pagamentoDe}
          onClose={() => setPagamentoDe(null)}
          onPaid={onPago}
        />
      )}
    </div>
  );
}
