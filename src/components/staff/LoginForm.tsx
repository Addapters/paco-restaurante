"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";

export function LoginForm() {
  const t = useTranslations("StaffPanel.login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unauthorized = searchParams.get("unauthorized") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(t("credenciaisInvalidas"));
      setBusy(false);
      return;
    }
    router.replace("/staff");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardTitle>{t("title")}</CardTitle>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
          autoComplete="current-password"
        />
        {unauthorized && !error && (
          <p className="text-sm font-medium text-terracotta-dark">
            {t("semPermissoes")}
          </p>
        )}
        {error && (
          <p className="text-sm font-medium text-terracotta-dark">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("aEntrar") : t("entrar")}
        </Button>
      </form>
      <p className="mt-4 text-xs text-smoke">{t("nota")}</p>
    </Card>
  );
}
