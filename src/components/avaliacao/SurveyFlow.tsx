"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

// URL de avaliações do Google (configurável por ambiente)
const GOOGLE_REVIEWS_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ??
  "https://www.google.com/maps/search/paco+restaurante";

// A partir de 4 estrelas consideramos a experiência positiva
const LIMIAR_POSITIVO = 4;

type Step = "pergunta" | "formulario" | "obrigado" | "redirecionar";

export function SurveyFlow({ mesaId }: { mesaId: string | null }) {
  const t = useTranslations("Avaliacao");
  const [step, setStep] = useState<Step>("pergunta");
  const [pontuacao, setPontuacao] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function getUid(): Promise<string | null> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return session.user.id;
    const { data } = await supabase.auth.signInAnonymously();
    return data.session?.user.id ?? null;
  }

  // O registo é guardado SEMPRE, qualquer que seja o caminho.
  async function guardar(
    valor: number,
    destino: "google_reviews" | "formulario_privado",
    texto?: string
  ): Promise<boolean> {
    const uid = await getUid();
    const { error: err } = await createClient()
      .from("satisfaction_surveys")
      .insert({
        cliente_id: uid,
        mesa_id: mesaId,
        pontuacao: valor,
        comentario: texto || null,
        encaminhado_para: destino,
      });
    return !err;
  }

  async function handleEstrela(valor: number) {
    if (busy) return;
    setPontuacao(valor);
    setError(false);

    if (valor >= LIMIAR_POSITIVO) {
      setBusy(true);
      const ok = await guardar(valor, "google_reviews");
      setBusy(false);
      if (!ok) {
        setError(true);
        return;
      }
      setStep("redirecionar");
      window.location.href = GOOGLE_REVIEWS_URL;
    } else {
      setStep("formulario");
    }
  }

  async function handleFormulario(e: React.FormEvent) {
    e.preventDefault();
    if (busy || pontuacao == null) return;
    setBusy(true);
    setError(false);
    const ok = await guardar(pontuacao, "formulario_privado", comentario);
    setBusy(false);
    if (!ok) {
      setError(true);
      return;
    }
    setStep("obrigado");
  }

  if (step === "redirecionar") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardTitle>{t("obrigadoTitle")}</CardTitle>
        <p className="mt-2 text-sm text-smoke">{t("aRedirecionar")}</p>
      </Card>
    );
  }

  if (step === "obrigado") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardTitle>{t("obrigadoTitle")}</CardTitle>
        <p className="mt-2 text-sm text-smoke">{t("obrigadoPrivado")}</p>
      </Card>
    );
  }

  if (step === "formulario") {
    return (
      <Card className="mx-auto max-w-md">
        <CardTitle>{t("lamentamos")}</CardTitle>
        <p className="mt-2 text-sm text-smoke">{t("formularioIntro")}</p>
        <form onSubmit={handleFormulario} className="mt-4 space-y-4">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            required
            rows={5}
            placeholder={t("comentarioPlaceholder")}
            className="w-full rounded-lg border border-ink/20 bg-paper p-3 text-sm text-ink placeholder:text-smoke focus:border-terracotta focus:outline-2 focus:outline-terracotta/40"
          />
          {error && (
            <p className="text-sm font-medium text-terracotta-dark">
              {t("erro")}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? t("aEnviar") : t("enviar")}
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md text-center">
      <CardTitle>{t("pergunta")}</CardTitle>
      <p className="mt-2 text-sm text-smoke">{t("perguntaNota")}</p>
      <div
        className="mt-6 flex justify-center gap-2"
        role="radiogroup"
        aria-label={t("pergunta")}
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((valor) => (
          <button
            key={valor}
            role="radio"
            aria-checked={pontuacao === valor}
            aria-label={t("estrelas", { count: valor })}
            disabled={busy}
            onClick={() => handleEstrela(valor)}
            onMouseEnter={() => setHover(valor)}
            className={cn(
              "text-4xl transition-transform hover:scale-110",
              (hover ?? pontuacao ?? 0) >= valor
                ? "text-terracotta"
                : "text-ink/20"
            )}
          >
            ★
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-4 text-sm font-medium text-terracotta-dark">
          {t("erro")}
        </p>
      )}
    </Card>
  );
}
