"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { DatePills, gerarDias } from "./DatePills";
import { TimePills } from "./TimePills";
import { PeopleCounter } from "./PeopleCounter";
import { gerarHorarios, MAX_PESSOAS } from "@/lib/reservas/horario";
import type { Locale } from "@/i18n/routing";

const HORARIOS = gerarHorarios();

// Reserva pública: cria uma linha "pendente" em reservations, que o
// staff confirma em /staff/reservas. O visitante não precisa de conta
// — é criada uma sessão anónima na submissão (cumpre o RLS). Se já
// estiver autenticado, os campos de contacto vêm pré-preenchidos.
export function ReservationForm() {
  const t = useTranslations("Reservas.form");
  const locale = useLocale() as Locale;
  const supabase = useMemo(() => createClient(), []);

  const dias = useMemo(() => gerarDias(locale), [locale]);
  const [data, setData] = useState(dias[0].iso);
  const [hora, setHora] = useState<string | null>(null);
  const [pessoas, setPessoas] = useState(2);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [estado, setEstado] = useState<"idle" | "ok" | "erro">("idle");

  // Pré-preenche com os dados do cliente autenticado, se existir sessão
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || user.is_anonymous) return;
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome, email, telefone")
        .eq("id", user.id)
        .maybeSingle();
      if (perfil) {
        setNome((v) => v || perfil.nome || "");
        setEmail((v) => v || perfil.email || "");
        setTelefone((v) => v || perfil.telefone || "");
      }
    });
  }, [supabase]);

  // Contagem por horário no dia escolhido (aproximação de capacidade)
  const carregarContagens = useCallback(
    async (diaIso: string) => {
      const { data } = await supabase.rpc("contagem_reservas_por_hora", {
        p_data: diaIso,
      });
      const mapa: Record<string, number> = {};
      for (const row of (data as { hora: string; total: number }[]) ?? []) {
        mapa[row.hora] = Number(row.total);
      }
      setContagens(mapa);
    },
    [supabase]
  );

  useEffect(() => {
    // Fetch legítimo: o setState acontece após o await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarContagens(data);
    setHora(null);
  }, [data, carregarContagens]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !hora) return;
    setBusy(true);
    setEstado("idle");

    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { data: anon } = await supabase.auth.signInAnonymously();
      session = anon.session;
    }
    if (!session) {
      setEstado("erro");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      cliente_id: session.user.id,
      data_hora: new Date(`${data}T${hora}`).toISOString(),
      numero_pessoas: pessoas,
      nome_contacto: nome,
      telefone_contacto: telefone || null,
      email_contacto: email || null,
    });
    setBusy(false);
    if (error) {
      setEstado("erro");
      return;
    }
    setEstado("ok");
  }

  if (estado === "ok") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardTitle>{t("okTitle")}</CardTitle>
        <p className="mt-2 text-sm text-smoke">{t("okNota")}</p>
      </Card>
    );
  }

  const podeSubmeter = !!hora && !!nome && pessoas <= MAX_PESSOAS;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-smoke">
          {t("dataLabel")}
        </h2>
        <DatePills selecionado={data} onSelect={setData} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-smoke">
          {t("horaLabel")}
        </h2>
        <TimePills
          horarios={HORARIOS}
          contagens={contagens}
          selecionado={hora}
          onSelect={setHora}
        />
      </section>

      <section>
        <PeopleCounter valor={pessoas} onChange={setPessoas} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-smoke">
          {t("contactoLabel")}
        </h2>
        <Input
          id="nome"
          label={t("nome")}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoComplete="name"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="telefone"
            type="tel"
            label={t("telefone")}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            autoComplete="tel"
          />
          <Input
            id="email"
            type="email"
            label={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
      </section>

      {estado === "erro" && (
        <p className="text-sm font-medium text-terracotta-dark">{t("erro")}</p>
      )}

      {/* Botão fixo de confirmação, no fundo do ecrã */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 p-4 backdrop-blur">
        <Button
          type="submit"
          size="lg"
          className="mx-auto block w-full max-w-md"
          disabled={busy || !podeSubmeter}
        >
          {busy ? t("aEnviar") : t("reservar")}
        </Button>
      </div>
    </form>
  );
}
