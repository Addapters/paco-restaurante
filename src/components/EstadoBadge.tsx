import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type OrderEstado = "pendente" | "em_preparacao" | "servido" | "pago";

// Estados diferenciados com a paleta do projeto:
// pendente = terracota, em preparação = ink, servido = verde salva, pago = neutro
const ESTADO_STYLES: Record<OrderEstado, string> = {
  pendente: "border-terracotta bg-terracotta/15 text-terracotta-dark",
  em_preparacao: "border-ink bg-ink/10 text-ink",
  servido: "border-sage bg-sage/15 text-sage-dark",
  pago: "border-smoke bg-smoke/10 text-smoke",
};

export function EstadoBadge({ estado }: { estado: OrderEstado }) {
  const t = useTranslations("Pedido.estado");
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold",
        ESTADO_STYLES[estado]
      )}
    >
      {t(estado)}
    </span>
  );
}
