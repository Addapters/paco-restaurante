"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { MAX_PESSOAS, MIN_PESSOAS } from "@/lib/reservas/horario";

// Contador +/- de pessoas. Acima do máximo, sugere contacto direto
// para grupos grandes em vez de aceitar a reserva online.
export function PeopleCounter({
  valor,
  onChange,
}: {
  valor: number;
  onChange(novoValor: number): void;
}) {
  const t = useTranslations("Reservas.form");
  const noMaximo = valor >= MAX_PESSOAS;

  return (
    <div>
      <div className="flex items-center justify-between rounded-2xl border border-ink/15 bg-cream px-4 py-2.5">
        <span className="text-sm font-medium text-ink">{t("pessoas")}</span>
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-full p-0"
            aria-label={t("menosPessoas")}
            disabled={valor <= MIN_PESSOAS}
            onClick={() => onChange(Math.max(MIN_PESSOAS, valor - 1))}
          >
            −
          </Button>
          <span className="w-6 text-center text-base font-bold text-ink">
            {valor}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 rounded-full p-0"
            aria-label={t("maisPessoas")}
            disabled={noMaximo}
            onClick={() => onChange(Math.min(MAX_PESSOAS, valor + 1))}
          >
            +
          </Button>
        </div>
      </div>
      {noMaximo && (
        <p className="mt-2 text-xs text-smoke">
          {t("gruposGrandes", { maximo: MAX_PESSOAS })}
        </p>
      )}
    </div>
  );
}
