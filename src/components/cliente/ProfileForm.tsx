"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

export interface ProfileFormData {
  id: string;
  nome: string;
  telefone: string | null;
  newsletter_subscrito: boolean;
}

// Edição dos dados do próprio perfil + consentimento de newsletter.
// (O envio real de campanhas será ligado mais tarde; por agora só
// guardamos a subscrição.)
export function ProfileForm({ profile }: { profile: ProfileFormData }) {
  const t = useTranslations("Perfil.form");
  const [nome, setNome] = useState(profile.nome);
  const [telefone, setTelefone] = useState(profile.telefone ?? "");
  const [newsletter, setNewsletter] = useState(profile.newsletter_subscrito);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(false);
    const { error: err } = await createClient()
      .from("profiles")
      .update({
        nome,
        telefone: telefone || null,
        newsletter_subscrito: newsletter,
      })
      .eq("id", profile.id);
    setBusy(false);
    if (err) {
      setError(true);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          className="mt-1 h-4 w-4 accent-terracotta"
        />
        <span className="text-sm text-ink">
          <span className="font-medium">{t("newsletter")}</span>
          <span className="block text-smoke">{t("newsletterNota")}</span>
        </span>
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? t("aGuardar") : t("guardar")}
        </Button>
        {saved && (
          <span className="text-sm font-medium text-sage-dark">
            ✓ {t("guardado")}
          </span>
        )}
        {error && (
          <span className="text-sm font-medium text-terracotta-dark">
            {t("erro")}
          </span>
        )}
      </div>
    </form>
  );
}
