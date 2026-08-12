"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";

// Reserva pública: cria uma linha "pendente" em reservations, que o
// staff confirma em /staff/reservas. O visitante não precisa de conta —
// é criada uma sessão anónima na submissão (cumpre o RLS).
export function ReservationForm() {
  const t = useTranslations("Reservas.form");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [pessoas, setPessoas] = useState("2");
  const [busy, setBusy] = useState(false);
  const [estado, setEstado] = useState<"idle" | "ok" | "erro">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setEstado("idle");

    const supabase = createClient();
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
      numero_pessoas: Number(pessoas),
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
        <CardTitle>✓ {t("okTitle")}</CardTitle>
        <p className="mt-2 text-sm text-smoke">{t("okNota")}</p>
      </Card>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <Card className="mx-auto max-w-md">
      <CardTitle>{t("title")}</CardTitle>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="data"
            type="date"
            min={hoje}
            label={t("data")}
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <Input
            id="hora"
            type="time"
            label={t("hora")}
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
          />
        </div>
        <Input
          id="pessoas"
          type="number"
          min="1"
          max="20"
          label={t("pessoas")}
          value={pessoas}
          onChange={(e) => setPessoas(e.target.value)}
          required
        />
        <Input
          id="nome"
          label={t("nome")}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoComplete="name"
        />
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
        {estado === "erro" && (
          <p className="text-sm font-medium text-terracotta-dark">{t("erro")}</p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("aEnviar") : t("reservar")}
        </Button>
      </form>
    </Card>
  );
}
