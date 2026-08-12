"use client";

import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { DIAS_ANTECEDENCIA } from "@/lib/reservas/horario";

export interface DiaOption {
  iso: string; // "YYYY-MM-DD"
  diaSemana: string;
  diaMes: string;
}

export function gerarDias(locale: Locale): DiaOption[] {
  const fmtSemana = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    weekday: "short",
  });
  const dias: DiaOption[] = [];
  for (let i = 0; i < DIAS_ANTECEDENCIA; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dias.push({
      iso: d.toISOString().slice(0, 10),
      diaSemana: fmtSemana.format(d).replace(".", ""),
      diaMes: String(d.getDate()),
    });
  }
  return dias;
}

// Fila horizontal com scroll de pills de dia — dia selecionado em
// terracota, os restantes em bege/branco com contorno subtil.
export function DatePills({
  selecionado,
  onSelect,
}: {
  selecionado: string;
  onSelect(iso: string): void;
}) {
  const locale = useLocale() as Locale;
  const dias = gerarDias(locale);

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {dias.map((dia) => {
        const ativo = dia.iso === selecionado;
        return (
          <button
            key={dia.iso}
            type="button"
            onClick={() => onSelect(dia.iso)}
            className={cn(
              "flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2.5 transition-colors",
              ativo
                ? "border-terracotta bg-terracotta text-white"
                : "border-ink/15 bg-cream text-ink hover:border-terracotta/50"
            )}
          >
            <span
              className={cn(
                "text-xs font-medium uppercase",
                ativo ? "text-white/80" : "text-smoke"
              )}
            >
              {dia.diaSemana}
            </span>
            <span className="mt-0.5 text-lg font-bold leading-none">
              {dia.diaMes}
            </span>
          </button>
        );
      })}
    </div>
  );
}
