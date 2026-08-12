"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type Mode = "login" | "registo";

// Login e registo self-service de clientes (email + password).
// Contas de staff/admin nunca passam por aqui — são criadas por convite.
export function AuthForm() {
  const t = useTranslations("ClienteAuth");
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError(t("credenciaisInvalidas"));
        setBusy(false);
        return;
      }
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome } },
      });
      if (err) {
        setError(err.message);
        setBusy(false);
        return;
      }
      // Sem sessão imediata = confirmação de email ativa no Supabase
      if (!data.session) {
        setConfirmarEmail(true);
        setBusy(false);
        return;
      }
    }

    router.replace("/cliente/perfil");
    router.refresh();
  }

  if (confirmarEmail) {
    return (
      <Card className="mx-auto w-full max-w-sm text-center">
        <CardTitle>{t("confirmaEmailTitle")}</CardTitle>
        <p className="mt-2 text-sm text-smoke">
          {t("confirmaEmail", { email })}
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <div className="mb-5 flex rounded-lg border border-ink/15 p-1">
        {(["login", "registo"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              mode === m ? "bg-ink text-white" : "text-ink hover:bg-ink/5"
            )}
          >
            {t(m)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "registo" && (
          <Input
            id="nome"
            label={t("nome")}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoComplete="name"
          />
        )}
        <Input
          id="email"
          type="email"
          label={t("email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          id="password"
          type="password"
          label={t("password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {error && (
          <p className="text-sm font-medium text-terracotta-dark">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("aProcessar") : t(mode === "login" ? "entrar" : "criarConta")}
        </Button>
      </form>
    </Card>
  );
}
