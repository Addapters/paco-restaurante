import { getTranslations } from "next-intl/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteSettings } from "@/lib/site-settings";
import { SurveyFlow } from "@/components/avaliacao/SurveyFlow";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Valida o parâmetro ?mesa= (id) no servidor; um valor inválido não
// impede a avaliação — apenas fica sem mesa associada.
async function validarMesa(mesaParam: string | undefined) {
  if (!mesaParam || !UUID_RE.test(mesaParam)) return null;
  const { data } = await createAdminClient()
    .from("restaurant_tables")
    .select("id")
    .eq("id", mesaParam)
    .maybeSingle();
  return data?.id ?? null;
}

export default async function AvaliacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const { mesa } = await searchParams;
  const [t, tCommon, mesaId, settings] = await Promise.all([
    getTranslations("Avaliacao"),
    getTranslations("Common"),
    validarMesa(mesa),
    getSiteSettings(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-4 border-sage bg-paper px-6 py-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className="font-bold text-ink">{tCommon("appName")}</span>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        <h1 className="mb-8 text-center text-3xl font-bold text-ink">
          {t("title")}
        </h1>
        <SurveyFlow
          mesaId={mesaId}
          googleReviewsUrl={settings.google_reviews_url}
        />
      </main>
    </div>
  );
}
