"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LIMITE_RESERVAS_POR_HORARIO,
  type HorarioOption,
} from "@/lib/reservas/horario";

// Grelha de pills de horário. Horários que já atingiram o limite
// aproximado de reservas ficam desativados (cinzento) — aproximação
// simples, sem gestão real de capacidade por horário. Horários já na
// madrugada do dia seguinte (sexta/sábado, até à 01h) levam um "+1".
export function TimePills({
  horarios,
  contagens,
  selecionado,
  onSelect,
}: {
  horarios: HorarioOption[];
  contagens: Record<string, number>;
  selecionado: string | null;
  onSelect(hora: string): void;
}) {
  const t = useTranslations("Reservas.form");

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {horarios.map(({ hora, diaSeguinte }) => {
          const cheio = (contagens[hora] ?? 0) >= LIMITE_RESERVAS_POR_HORARIO;
          const ativo = hora === selecionado;
          return (
            <button
              key={hora}
              type="button"
              disabled={cheio}
              onClick={() => onSelect(hora)}
              title={diaSeguinte ? t("diaSeguinte") : undefined}
              className={cn(
                "relative rounded-full border py-2 text-sm font-medium transition-colors",
                cheio
                  ? "cursor-not-allowed border-ink/10 bg-ink/5 text-smoke/60"
                  : ativo
                    ? "border-terracotta bg-terracotta text-white"
                    : "border-ink/15 bg-cream text-ink hover:border-terracotta/50"
              )}
            >
              {hora}
              {diaSeguinte && (
                <sup className="ml-0.5 text-[10px] font-bold">+1</sup>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-smoke">{t("capacidadeNota")}</p>
    </div>
  );
}
