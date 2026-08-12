"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useMesaOrders } from "./MesaOrdersProvider";
import { Button } from "@/components/ui";

// Convite ao inquérito de satisfação, mostrado quando um pedido da
// sessão passa a "pago" (deteção via Realtime no provider).
export function SurveyInvite() {
  const { mesa, refeicaoPaga, dismissRefeicaoPaga } = useMesaOrders();
  const t = useTranslations("Avaliacao.convite");

  if (!refeicaoPaga) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl border-2 border-sage bg-paper p-4 shadow-lg">
        <p className="min-w-0 flex-1 text-sm text-ink">
          <span className="font-semibold">{t("title")}</span>
          <span className="block text-smoke">{t("subtitle")}</span>
        </p>
        <div className="flex items-center gap-2">
          <Link href={{ pathname: "/avaliacao", query: { mesa: mesa.id } }}>
            <Button variant="secondary" size="sm">
              {t("avaliar")}
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={dismissRefeicaoPaga}>
            {t("agora_nao")}
          </Button>
        </div>
      </div>
    </div>
  );
}
