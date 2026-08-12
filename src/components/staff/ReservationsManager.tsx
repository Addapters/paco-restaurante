"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils";

type ReservaEstado = "pendente" | "confirmada" | "cancelada";

interface Reserva {
  id: string;
  data_hora: string;
  numero_pessoas: number;
  estado: ReservaEstado;
  nome_contacto: string;
  telefone_contacto: string | null;
  email_contacto: string | null;
}

const ESTADO_STYLES: Record<ReservaEstado, string> = {
  pendente: "border-terracotta bg-terracotta/15 text-terracotta-dark",
  confirmada: "border-sage bg-sage/15 text-sage-dark",
  cancelada: "border-smoke bg-smoke/10 text-smoke",
};

// Gestão de reservas pelo staff: confirmar/cancelar pedidos pendentes.
export function ReservationsManager() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("StaffPanel.reservas");
  const locale = useLocale() as Locale;
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const carregar = useCallback(async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const { data } = await supabase
      .from("reservations")
      .select(
        "id, data_hora, numero_pessoas, estado, nome_contacto, telefone_contacto, email_contacto"
      )
      .gte("data_hora", ontem.toISOString())
      .order("data_hora");
    setReservas((data as Reserva[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function mudarEstado(id: string, estado: ReservaEstado) {
    setReservas((prev) =>
      prev.map((r) => (r.id === id ? { ...r, estado } : r))
    );
    await supabase.from("reservations").update({ estado }).eq("id", id);
  }

  const pendentes = reservas.filter((r) => r.estado === "pendente").length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">
        {t("title")}
        {pendentes > 0 && (
          <span className="ml-2 rounded-full bg-terracotta px-2.5 py-0.5 text-sm text-white">
            {pendentes}
          </span>
        )}
      </h1>

      {reservas.length === 0 ? (
        <p className="text-smoke">{t("vazio")}</p>
      ) : (
        reservas.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">
                  {new Date(r.data_hora).toLocaleString(
                    locale === "pt" ? "pt-PT" : "en-GB",
                    {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}{" "}
                  · {t("pessoas", { count: r.numero_pessoas })}
                </p>
                <p className="text-sm text-smoke">
                  {r.nome_contacto}
                  {r.telefone_contacto && ` · ${r.telefone_contacto}`}
                  {r.email_contacto && ` · ${r.email_contacto}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    ESTADO_STYLES[r.estado]
                  )}
                >
                  {t(`estados.${r.estado}`)}
                </span>
                {r.estado === "pendente" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => mudarEstado(r.id, "confirmada")}
                  >
                    ✓ {t("confirmar")}
                  </Button>
                )}
                {r.estado !== "cancelada" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => mudarEstado(r.id, "cancelada")}
                  >
                    {t("cancelar")}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
