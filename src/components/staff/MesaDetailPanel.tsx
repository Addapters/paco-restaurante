"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle } from "@/components/ui";
import { EstadoBadge } from "@/components/EstadoBadge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Mesa, StaffOrder } from "./StaffDashboard";

interface MenuItemOption {
  id: string;
  nome_pt: string;
  nome_en: string;
  preco: number;
}

interface LinhaNova {
  menuItemId: string;
  quantidade: number;
}

// Painel de detalhe de uma mesa da planta: responsável, lugares com os
// itens/estados, e criação de pedido lugar-primeiro.
export function MesaDetailPanel({
  mesa,
  orders,
  nomeDoStaff,
  meuId,
  onAtribuir,
  onAvancar,
  onFechar,
}: {
  mesa: Mesa;
  orders: StaffOrder[];
  nomeDoStaff: Map<string, string>;
  meuId: string | null;
  onAtribuir(mesaId: string, assumir: boolean): Promise<boolean>;
  onAvancar(order: StaffOrder): void;
  onFechar(): void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("StaffPanel.planta.painel");
  const tAcao = useTranslations("StaffPanel.pedidos.acao");
  const locale = useLocale() as Locale;

  const [itensMenu, setItensMenu] = useState<MenuItemOption[]>([]);
  const [lugarNovo, setLugarNovo] = useState<number | null>(null);
  const [linhas, setLinhas] = useState<LinhaNova[]>([]);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("id, nome_pt, nome_en, preco")
      .order("nome_pt")
      .then(({ data }) => setItensMenu((data as MenuItemOption[]) ?? []));
  }, [supabase]);

  const capacidade = mesa.capacidade ?? 4;
  const ativos = orders.filter(
    (o) => o.mesa_id === mesa.id && o.estado !== "pago"
  );

  // Itens ativos agrupados por lugar (com o estado do pedido-pai)
  const porLugar = useMemo(() => {
    const mapa = new Map<
      number | null,
      { order: StaffOrder; item: StaffOrder["order_items"][number] }[]
    >();
    for (const order of ativos) {
      for (const item of order.order_items) {
        const chave =
          item.lugar_numero != null && item.lugar_numero <= capacidade
            ? item.lugar_numero
            : null;
        mapa.set(chave, [...(mapa.get(chave) ?? []), { order, item }]);
      }
    }
    return mapa;
  }, [ativos, capacidade]);

  const responsavel = mesa.staff_responsavel_id
    ? (nomeDoStaff.get(mesa.staff_responsavel_id) ?? "—")
    : null;
  const souResponsavel =
    mesa.staff_responsavel_id != null && mesa.staff_responsavel_id === meuId;

  async function criarPedido() {
    const items = linhas
      .filter((l) => l.menuItemId && l.quantidade > 0)
      .map((l) => ({
        menu_item_id: l.menuItemId,
        quantidade: l.quantidade,
        lugar_numero: lugarNovo,
      }));
    if (lugarNovo == null || items.length === 0 || busy) return;
    setBusy(true);
    setErro(false);
    const { error } = await supabase.rpc("place_staff_order", {
      p_mesa_id: mesa.id,
      p_origem: "mesa",
      p_items: items,
    });
    setBusy(false);
    if (error) {
      setErro(true);
      return;
    }
    setLinhas([]);
    setLugarNovo(null);
  }

  const selectClass =
    "h-9 rounded-lg border border-ink/20 bg-paper px-2 text-sm text-ink focus:border-terracotta focus:outline-none";

  return (
    <Card className="border-sage/50">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>
          {t("titulo", { numero: mesa.numero, capacidade })}
        </CardTitle>
        <div className="flex items-center gap-2">
          {responsavel ? (
            <>
              <span className="text-sm text-smoke">
                {t("responsavel")}: <span className="font-semibold text-ink">{responsavel}</span>
              </span>
              {souResponsavel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAtribuir(mesa.id, false)}
                >
                  {t("libertar")}
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onAtribuir(mesa.id, true)}
            >
              ✋ {t("assumir")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onFechar} aria-label={t("fechar")}>
            ✕
          </Button>
        </div>
      </div>

      {/* Lugares */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: capacidade }, (_, i) => i + 1).map((n) => {
          const doLugar = porLugar.get(n) ?? [];
          return (
            <div key={n} className="rounded-xl border border-ink/10 bg-cream/60 p-3">
              <p className="text-sm font-semibold text-ink">
                {t("lugarN", { n })}
              </p>
              {doLugar.length === 0 ? (
                <p className="mt-1 text-xs text-smoke">{t("lugarVazio")}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {doLugar.map(({ order, item }) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.quantidade}×{" "}
                        {item.menu_items
                          ? locale === "pt"
                            ? item.menu_items.nome_pt
                            : item.menu_items.nome_en
                          : "—"}
                        {item.e_oferta && " 🎁"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <EstadoBadge estado={order.estado} />
                        {(order.estado === "pendente" ||
                          order.estado === "em_preparacao") && (
                          <Button size="sm" onClick={() => onAvancar(order)}>
                            {tAcao(
                              order.estado === "pendente"
                                ? "em_preparacao"
                                : "servido"
                            )}{" "}
                            →
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {(porLugar.get(null) ?? []).length > 0 && (
          <div className="rounded-xl border border-ink/10 bg-cream/60 p-3">
            <p className="text-sm font-semibold text-smoke">{t("semLugar")}</p>
            <ul className="mt-2 space-y-1.5">
              {(porLugar.get(null) ?? []).map(({ order, item }) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-sm text-ink"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {item.quantidade}×{" "}
                    {item.menu_items
                      ? locale === "pt"
                        ? item.menu_items.nome_pt
                        : item.menu_items.nome_en
                      : "—"}
                  </span>
                  <EstadoBadge estado={order.estado} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Novo pedido: primeiro o lugar, depois os itens */}
      <div className="mt-5 border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold text-ink">{t("novoPedido")}</p>
        <p className="mt-1 text-xs text-smoke">{t("novoPedidoNota")}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: capacidade }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => {
                setLugarNovo(n);
                if (linhas.length === 0) {
                  setLinhas([{ menuItemId: "", quantidade: 1 }]);
                }
              }}
              className={cn(
                "h-10 w-10 rounded-full border-2 text-sm font-bold transition-colors",
                lugarNovo === n
                  ? "border-sage-dark bg-sage text-white"
                  : "border-terracotta/50 bg-cream text-ink hover:bg-terracotta/15"
              )}
            >
              {n}
            </button>
          ))}
        </div>

        {lugarNovo != null && (
          <div className="mt-3 space-y-2">
            {linhas.map((linha, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={linha.menuItemId}
                  onChange={(e) =>
                    setLinhas((prev) =>
                      prev.map((l, i) =>
                        i === index ? { ...l, menuItemId: e.target.value } : l
                      )
                    )
                  }
                  className={`${selectClass} min-w-0 flex-1`}
                >
                  <option value="">{t("escolherItem")}</option>
                  {itensMenu.map((item) => (
                    <option key={item.id} value={item.id}>
                      {locale === "pt" ? item.nome_pt : item.nome_en} (
                      {formatPrice(item.preco, locale)})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={linha.quantidade}
                  aria-label={t("quantidade")}
                  onChange={(e) =>
                    setLinhas((prev) =>
                      prev.map((l, i) =>
                        i === index
                          ? { ...l, quantidade: Number(e.target.value) }
                          : l
                      )
                    )
                  }
                  className={`${selectClass} w-16`}
                />
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLinhas((prev) => [...prev, { menuItemId: "", quantidade: 1 }])
                }
              >
                + {t("adicionarItem")}
              </Button>
              <Button size="sm" onClick={criarPedido} disabled={busy}>
                {busy ? t("aCriar") : t("criarPedido", { n: lugarNovo })}
              </Button>
              {erro && (
                <span className="text-xs font-medium text-terracotta-dark">
                  {t("erroCriar")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
