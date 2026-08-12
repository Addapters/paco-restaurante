"use client";

import { useTranslations } from "next-intl";
import { useMesaOrders } from "./MesaOrdersProvider";
import { Button, Card, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

// Escolha do lugar na mesa (1..capacidade), pedida antes do primeiro
// item entrar no carrinho. Os itens ficam associados a este lugar.
export function SeatPicker() {
  const { mesa, lugar, pedirLugarAberto, escolherLugar, fecharEscolhaDeLugar } =
    useMesaOrders();
  const t = useTranslations("Pedido.lugar");

  if (!pedirLugarAberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-sm">
        <CardTitle>{t("titulo")}</CardTitle>
        <p className="mt-1 text-sm text-smoke">
          {t("nota", { numero: mesa.numero })}
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: mesa.capacidade }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => escolherLugar(n)}
              className={cn(
                "h-12 rounded-full border-2 text-base font-bold transition-colors",
                lugar === n
                  ? "border-sage bg-sage text-white"
                  : "border-terracotta/50 bg-cream text-ink hover:bg-terracotta/15"
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={fecharEscolhaDeLugar}>
            {t("cancelar")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
