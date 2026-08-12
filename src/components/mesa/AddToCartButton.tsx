"use client";

import { useTranslations } from "next-intl";
import { useMesaOrdersOptional } from "./MesaOrdersProvider";
import { Button } from "@/components/ui";

export interface AddableItem {
  itemId: string;
  nome_pt: string;
  nome_en: string;
  preco: number;
}

// Botão "Adicionar" com stepper de quantidade quando o item já está no
// carrinho. Fora do contexto de mesa (menu público) não renderiza nada.
export function AddToCartButton({ item }: { item: AddableItem }) {
  const ctx = useMesaOrdersOptional();
  const t = useTranslations("Pedido");
  if (!ctx) return null;

  const line = ctx.cart.find((l) => l.itemId === item.itemId);

  if (!line) {
    return (
      <Button
        size="sm"
        className="mt-2 w-fit"
        onClick={() => ctx.addToCart(item)}
      >
        + {t("adicionar")}
      </Button>
    );
  }

  return (
    <div className="mt-2 flex w-fit items-center gap-1 rounded-lg border border-terracotta">
      <Button
        size="sm"
        variant="ghost"
        aria-label={t("menos")}
        onClick={() => ctx.setQuantity(item.itemId, line.quantidade - 1)}
      >
        −
      </Button>
      <span className="min-w-6 text-center text-sm font-semibold text-ink">
        {line.quantidade}
      </span>
      <Button
        size="sm"
        variant="ghost"
        aria-label={t("mais")}
        onClick={() => ctx.setQuantity(item.itemId, line.quantidade + 1)}
      >
        +
      </Button>
    </div>
  );
}
