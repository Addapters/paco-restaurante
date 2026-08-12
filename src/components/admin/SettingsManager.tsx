"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";

interface Definicoes {
  google_reviews_url: string;
  instagram_url: string;
  facebook_url: string;
  integracao_thefork_ativa: boolean;
  integracao_uber_ativa: boolean;
}

// Definições do site: links informativos + integrações futuras
// (TheFork/Uber ainda desativadas — por agora apenas informativo).
export function SettingsManager() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("AdminArea.definicoes");

  const [defs, setDefs] = useState<Definicoes>({
    google_reviews_url: "",
    instagram_url: "",
    facebook_url: "",
    integracao_thefork_ativa: false,
    integracao_uber_ativa: false,
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<"ok" | "erro" | null>(null);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDefs({
            google_reviews_url: data.google_reviews_url ?? "",
            instagram_url: data.instagram_url ?? "",
            facebook_url: data.facebook_url ?? "",
            integracao_thefork_ativa: data.integracao_thefork_ativa,
            integracao_uber_ativa: data.integracao_uber_ativa,
          });
        }
      });
  }, [supabase]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const { error } = await supabase.from("site_settings").upsert({
      id: 1,
      google_reviews_url: defs.google_reviews_url || null,
      instagram_url: defs.instagram_url || null,
      facebook_url: defs.facebook_url || null,
    });
    setBusy(false);
    setFeedback(error ? "erro" : "ok");
    if (!error) setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>{t("ligacoes.title")}</CardTitle>
        <p className="mt-1 text-sm text-smoke">{t("ligacoes.nota")}</p>
        <form onSubmit={guardar} className="mt-4 max-w-xl space-y-4">
          <Input
            id="google"
            type="url"
            label={t("ligacoes.google")}
            placeholder="https://g.page/r/…/review"
            value={defs.google_reviews_url}
            onChange={(e) =>
              setDefs((d) => ({ ...d, google_reviews_url: e.target.value }))
            }
          />
          <Input
            id="instagram"
            type="url"
            label="Instagram"
            placeholder="https://instagram.com/pacorestaurante"
            value={defs.instagram_url}
            onChange={(e) =>
              setDefs((d) => ({ ...d, instagram_url: e.target.value }))
            }
          />
          <Input
            id="facebook"
            type="url"
            label="Facebook"
            placeholder="https://facebook.com/pacorestaurante"
            value={defs.facebook_url}
            onChange={(e) =>
              setDefs((d) => ({ ...d, facebook_url: e.target.value }))
            }
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? t("aGuardar") : t("guardar")}
            </Button>
            {feedback === "ok" && (
              <span className="text-sm font-medium text-sage-dark">
                ✓ {t("guardado")}
              </span>
            )}
            {feedback === "erro" && (
              <span className="text-sm font-medium text-terracotta-dark">
                {t("erro")}
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>{t("integracoes.title")}</CardTitle>
        <p className="mt-1 text-sm text-smoke">{t("integracoes.nota")}</p>
        <div className="mt-4 space-y-3">
          {(
            [
              { key: "thefork", ativa: defs.integracao_thefork_ativa },
              { key: "uber", ativa: defs.integracao_uber_ativa },
            ] as const
          ).map(({ key, ativa }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-cream/60 p-3 opacity-70"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {t(`integracoes.${key}`)}
                </p>
                <p className="text-xs text-smoke">
                  {t("integracoes.estadoInformativo")}
                </p>
              </div>
              <label className="flex cursor-not-allowed items-center gap-2 text-xs text-smoke">
                <input type="checkbox" checked={ativa} disabled className="h-4 w-4" />
                {t("integracoes.brevemente")}
              </label>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
