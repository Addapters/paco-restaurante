"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Mesa } from "./StaffDashboard";

export type MesaEstadoVisual = "livre" | "ocupada" | "alerta";

const SALAS = ["salao", "terraco"] as const;
export type Sala = (typeof SALAS)[number];

// Iniciais do staff responsável (ex.: "Rita Serviço" → "RS")
export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// Planta da sala: mesas posicionadas por pos_x/pos_y, reconhecíveis
// pela forma e número, com estado por cor (paleta do tema).
export function FloorPlan({
  mesas,
  estadoDe,
  selecionada,
  onSelect,
  nomeDoStaff,
}: {
  mesas: Mesa[];
  estadoDe: Map<string, MesaEstadoVisual>;
  selecionada: string | null;
  onSelect(id: string): void;
  nomeDoStaff: Map<string, string>;
}) {
  const t = useTranslations("StaffPanel.planta");
  const [sala, setSala] = useState<Sala>("salao");
  const daSala = mesas.filter((m) => (m.sala ?? "salao") === sala);

  return (
    <div>
      {/* Tabs pill */}
      <div className="mb-4 flex w-fit gap-1 rounded-full border border-ink/15 bg-paper p-1">
        {SALAS.map((s) => (
          <button
            key={s}
            onClick={() => setSala(s)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              sala === s ? "bg-ink text-white" : "text-ink hover:bg-ink/5"
            )}
          >
            {t(`salas.${s}`)}
          </button>
        ))}
      </div>

      {/* Plano */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink/10 bg-cream shadow-sm sm:aspect-[16/9]">
        {daSala.map((mesa) => {
          const estado = estadoDe.get(mesa.id) ?? "livre";
          const estaSelecionada = selecionada === mesa.id;
          const redonda = mesa.forma === "redonda";
          const grande = (mesa.capacidade ?? 4) >= 6;
          const responsavel = mesa.staff_responsavel_id
            ? nomeDoStaff.get(mesa.staff_responsavel_id)
            : null;

          return (
            <button
              key={mesa.id}
              onClick={() => onSelect(mesa.id)}
              aria-label={t("mesaAria", { numero: mesa.numero })}
              style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%` }}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border-2 shadow-md transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                redonda ? "rounded-full" : "rounded-xl",
                redonda
                  ? grande
                    ? "h-20 w-20"
                    : "h-16 w-16"
                  : grande
                    ? "h-14 w-24"
                    : "h-14 w-20",
                // Estados — sempre dentro da paleta terracota/salva/bege
                estaSelecionada
                  ? "border-sage-dark bg-sage text-white"
                  : estado === "alerta"
                    ? "animate-pulse border-terracotta-dark bg-terracotta-dark text-white"
                    : estado === "ocupada"
                      ? "border-terracotta-dark/40 bg-terracotta text-white"
                      : "border-terracotta/40 bg-cream text-ink"
              )}
            >
              <span className="text-lg font-bold leading-none">
                {mesa.numero}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  estaSelecionada || estado !== "livre"
                    ? "text-white/80"
                    : "text-smoke"
                )}
              >
                {mesa.capacidade ?? 4}p
              </span>
              {responsavel && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                  {iniciais(responsavel)}
                </span>
              )}
            </button>
          );
        })}
        {daSala.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-smoke">
            {t("salaVazia")}
          </p>
        )}
      </div>

      {/* Legenda */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-smoke">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-terracotta/40 bg-cream" />
          {t("legenda.livre")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-terracotta" />
          {t("legenda.ocupada")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 animate-pulse rounded-full bg-terracotta-dark" />
          {t("legenda.alerta")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-sage" />
          {t("legenda.selecionada")}
        </span>
      </div>
    </div>
  );
}
