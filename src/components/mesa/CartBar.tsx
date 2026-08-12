"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { MenuCategory } from "@/lib/menu";
import { getUpsellEngine } from "@/lib/paco-ai";
import { useMesaOrders } from "./MesaOrdersProvider";
import { Button } from "@/components/ui";
import { formatPrice } from "@/lib/format";

const upsellEngine = getUpsellEngine();

// Barra fixa no fundo com o resumo do carrinho; expande para rever
// quantidades e submeter o pedido. Com o menu disponível, o PACO.AI
// sugere 1-2 itens complementares.
export function CartBar({ categories = [] }: { categories?: MenuCategory[] }) {
  const {
    cart,
    cartCount,
    cartTotal,
    addToCart,
    setQuantity,
    submitting,
    submitOrder,
    lugar,
    abrirEscolhaDeLugar,
  } = useMesaOrders();
  const t = useTranslations("Pedido");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<"ok" | "erro" | null>(null);

  const sugestoes = useMemo(
    () =>
      upsellEngine.sugerir(
        cart.map((l) => l.itemId),
        categories
      ),
    [cart, categories]
  );

  if (cart.length === 0 && !feedback) return null;

  async function handleSubmit() {
    const ok = await submitOrder();
    setFeedback(ok ? "ok" : "erro");
    if (ok) setOpen(false);
    setTimeout(() => setFeedback(null), 6000);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="mx-auto max-w-xl rounded-2xl border border-ink/10 bg-paper shadow-lg">
        {feedback === "ok" && cart.length === 0 ? (
          <p className="px-5 py-4 text-center font-medium text-sage-dark">
            ✓ {t("enviado")}
          </p>
        ) : (
          <>
            {open && (
              <div className="space-y-3 border-b border-ink/10 px-5 py-4">
                {cart.map((line) => (
                  <div key={line.itemId} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {locale === "pt" ? line.nome_pt : line.nome_en}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t("menos")}
                        onClick={() =>
                          setQuantity(line.itemId, line.quantidade - 1)
                        }
                      >
                        −
                      </Button>
                      <span className="min-w-5 text-center text-sm font-semibold">
                        {line.quantidade}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={t("mais")}
                        onClick={() =>
                          setQuantity(line.itemId, line.quantidade + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                    <span className="w-16 text-right text-sm font-medium text-ink">
                      {formatPrice(line.preco * line.quantidade, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {sugestoes.length > 0 && (
              <div className="border-b border-ink/10 px-5 py-3">
                <p className="text-xs font-semibold text-sage-dark">
                  ✨ {t("upsell.titulo")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sugestoes.map(({ item, motivo }) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        addToCart({
                          itemId: item.id,
                          nome_pt: item.nome_pt,
                          nome_en: item.nome_en,
                          preco: item.preco,
                        })
                      }
                      title={t(`upsell.motivos.${motivo}`)}
                      className="flex items-center gap-1.5 rounded-full border border-sage bg-sage/10 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-sage/25"
                    >
                      + {locale === "pt" ? item.nome_pt : item.nome_en}
                      <span className="text-smoke">
                        {formatPrice(item.preco, locale)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-5 py-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => setOpen((v) => !v)}
              >
                <span className="block text-xs text-smoke">
                  {t("itens", { count: cartCount })}
                  {lugar != null && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirEscolhaDeLugar();
                      }}
                      className="ml-2 rounded-full bg-sage/15 px-2 py-0.5 text-xs font-medium text-sage-dark hover:bg-sage/25"
                    >
                      {t("lugar.chip", { n: lugar })} ✎
                    </span>
                  )}{" "}
                  · {open ? "▾" : "▴"}
                </span>
                <span className="font-bold text-ink">
                  {t("total")}: {formatPrice(cartTotal, locale)}
                </span>
              </button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? t("aEnviar") : t("submeter")}
              </Button>
            </div>

            {feedback === "erro" && (
              <p className="px-5 pb-3 text-sm font-medium text-terracotta-dark">
                {t("erro")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
