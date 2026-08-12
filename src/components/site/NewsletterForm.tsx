"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

// Subscrição de newsletter: guarda o email em newsletter_subscribers.
// Sem envio automático de emails nesta fase.
export function NewsletterForm() {
  const t = useTranslations("Footer.newsletter");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "ok" | "duplicado" | "erro">(
    "idle"
  );
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await createClient()
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (!error) {
      setEstado("ok");
      setEmail("");
    } else if (error.code === "23505") {
      setEstado("duplicado");
    } else {
      setEstado("erro");
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-ink">{t("titulo")}</p>
      <p className="text-xs text-smoke">{t("nota")}</p>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEstado("idle");
          }}
          placeholder={t("placeholder")}
          className="h-9 min-w-0 flex-1 rounded-lg border border-ink/20 bg-paper px-3 text-sm text-ink placeholder:text-smoke focus:border-terracotta focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={busy}>
          {t("subscrever")}
        </Button>
      </form>
      {estado === "ok" && (
        <p className="mt-1 text-xs font-medium text-sage-dark">✓ {t("ok")}</p>
      )}
      {estado === "duplicado" && (
        <p className="mt-1 text-xs font-medium text-sage-dark">
          {t("duplicado")}
        </p>
      )}
      {estado === "erro" && (
        <p className="mt-1 text-xs font-medium text-terracotta-dark">
          {t("erro")}
        </p>
      )}
    </div>
  );
}
