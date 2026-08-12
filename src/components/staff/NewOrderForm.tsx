"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import type { Mesa, OrderOrigem } from "./StaffDashboard";

interface MenuItemOption {
  id: string;
  nome_pt: string;
  nome_en: string;
  preco: number;
}

interface Linha {
  menuItemId: string;
  quantidade: number;
}

const ORIGENS: OrderOrigem[] = [
  "mesa",
  "uber_informativo",
  "thefork_informativo",
  "outro",
];

// Registo manual de pedidos pelo staff: na mesa, ou informativo de
// plataformas externas (Uber/TheFork) apenas para estatística — sem
// qualquer integração real com essas plataformas.
export function NewOrderForm({ mesas }: { mesas: Mesa[] }) {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("StaffPanel.novoPedido");
  const locale = useLocale() as Locale;

  const [itensMenu, setItensMenu] = useState<MenuItemOption[]>([]);
  const [origem, setOrigem] = useState<OrderOrigem>("mesa");
  const [mesaId, setMesaId] = useState<string>("");
  const [linhas, setLinhas] = useState<Linha[]>([
    { menuItemId: "", quantidade: 1 },
  ]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"ok" | "erro" | null>(null);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("id, nome_pt, nome_en, preco")
      .order("nome_pt")
      .then(({ data }) => setItensMenu((data as MenuItemOption[]) ?? []));
  }, [supabase]);

  const precoDe = useMemo(
    () => new Map(itensMenu.map((i) => [i.id, i.preco])),
    [itensMenu]
  );
  const total = linhas.reduce(
    (s, l) => s + (precoDe.get(l.menuItemId) ?? 0) * l.quantidade,
    0
  );

  function setLinha(index: number, patch: Partial<Linha>) {
    setLinhas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const items = linhas
      .filter((l) => l.menuItemId && l.quantidade > 0)
      .map((l) => ({ menu_item_id: l.menuItemId, quantidade: l.quantidade }));
    if (items.length === 0 || busy) return;
    if (origem === "mesa" && !mesaId) return;

    setBusy(true);
    setFeedback(null);
    const { error } = await supabase.rpc("place_staff_order", {
      p_mesa_id: mesaId || null,
      p_origem: origem,
      p_items: items,
    });
    setBusy(false);
    if (error) {
      setFeedback("erro");
      return;
    }
    setFeedback("ok");
    setLinhas([{ menuItemId: "", quantidade: 1 }]);
    setMesaId("");
    setTimeout(() => setFeedback(null), 4000);
  }

  const selectClass =
    "h-10 rounded-lg border border-ink/20 bg-paper px-3 text-sm text-ink focus:border-terracotta focus:outline-2 focus:outline-terracotta/40";

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">
              {t("origem")}
            </span>
            <select
              value={origem}
              onChange={(e) => setOrigem(e.target.value as OrderOrigem)}
              className={selectClass}
            >
              {ORIGENS.map((o) => (
                <option key={o} value={o}>
                  {t(`origens.${o}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium text-ink">
              {t("mesa")}
              {origem !== "mesa" && ` (${t("opcional")})`}
            </span>
            <select
              value={mesaId}
              onChange={(e) => setMesaId(e.target.value)}
              required={origem === "mesa"}
              className={selectClass}
            >
              <option value="">—</option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.numero}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink">
            {t("itens")}
          </span>
          {linhas.map((linha, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={linha.menuItemId}
                onChange={(e) => setLinha(index, { menuItemId: e.target.value })}
                required
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
                onChange={(e) =>
                  setLinha(index, { quantidade: Number(e.target.value) })
                }
                className={`${selectClass} w-20`}
                aria-label={t("quantidade")}
              />
              {linhas.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("removerItem")}
                  onClick={() =>
                    setLinhas((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
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
        </div>

        <div className="flex items-center gap-4 border-t border-ink/10 pt-4">
          <span className="font-bold text-ink">
            {t("total")}: {formatPrice(total, locale)}
          </span>
          <Button type="submit" disabled={busy}>
            {busy ? t("aCriar") : t("criar")}
          </Button>
          {feedback === "ok" && (
            <span className="text-sm font-medium text-sage-dark">
              ✓ {t("criado")}
            </span>
          )}
          {feedback === "erro" && (
            <span className="text-sm font-medium text-terracotta-dark">
              {t("erroCriar")}
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
