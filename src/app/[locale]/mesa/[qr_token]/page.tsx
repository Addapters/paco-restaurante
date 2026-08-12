import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMenu } from "@/lib/menu";
import { MenuList } from "@/components/menu/MenuList";
import { MesaSession } from "@/components/mesa/MesaSession";
import { CampaignsSection } from "@/components/mesa/CampaignsSection";
import { MesaOrdersProvider } from "@/components/mesa/MesaOrdersProvider";
import { TableActions } from "@/components/mesa/TableActions";
import { OrdersHistory } from "@/components/mesa/OrdersHistory";
import { CartBar } from "@/components/mesa/CartBar";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Site institucional (placeholder até existir o domínio real)
const SITE_INSTITUCIONAL =
  process.env.NEXT_PUBLIC_INSTITUTIONAL_URL ?? "https://www.pacorestaurante.pt";

async function getMesaByQrToken(qrToken: string) {
  if (!UUID_RE.test(qrToken)) return null;
  // A leitura de restaurant_tables é restrita a utilizadores autenticados;
  // quem chega pelo QR ainda é anónimo, por isso a resolução do token é
  // feita no servidor com o cliente admin (apenas id e numero).
  const admin = createAdminClient();
  const { data } = await admin
    .from("restaurant_tables")
    .select("id, numero, mesa_apadrinhada_cliente_id")
    .eq("qr_token", qrToken)
    .maybeSingle();
  return data;
}

// Mesa apadrinhada: se o cliente autenticado for o padrinho desta mesa,
// devolve o nome para a mensagem personalizada de boas-vindas.
async function getPadrinhoNome(
  mesaApadrinhadaClienteId: string | null
): Promise<string | null> {
  if (!mesaApadrinhadaClienteId) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous || user.id !== mesaApadrinhadaClienteId) {
    return null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, email")
    .eq("id", user.id)
    .single();
  return profile?.nome || profile?.email || null;
}

export default async function MesaPage({
  params,
}: {
  params: Promise<{ locale: Locale; qr_token: string }>;
}) {
  const { locale, qr_token } = await params;
  const mesa = await getMesaByQrToken(qr_token);
  if (!mesa) notFound();

  const [t, tCommon, categories, padrinhoNome] = await Promise.all([
    getTranslations("Mesa"),
    getTranslations("Common"),
    getMenu(),
    getPadrinhoNome(mesa.mesa_apadrinhada_cliente_id),
  ]);

  return (
    <MesaOrdersProvider
      mesa={{ id: mesa.id, numero: mesa.numero, qrToken: qr_token }}
    >
    <div className="flex min-h-screen flex-col pb-24">
      <MesaSession
        mesa={{ id: mesa.id, numero: mesa.numero, qrToken: qr_token }}
      />

      <header className="border-b-4 border-terracotta bg-paper px-6 py-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-bold text-ink">{tCommon("appName")}</span>
            <span className="rounded-full bg-terracotta px-3 py-1 text-sm font-semibold text-white">
              {t("mesa", { numero: mesa.numero })}
            </span>
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-12 px-6 py-10">
        {padrinhoNome ? (
          <div className="rounded-2xl border-2 border-terracotta bg-terracotta/10 p-6">
            <h1 className="text-3xl font-bold text-ink">
              ★ {t("bemVindoPadrinho", { nome: padrinhoNome })}
            </h1>
            <p className="mt-2 text-ink/80">{t("introPadrinho")}</p>
          </div>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-ink">{t("bemVindo")}</h1>
            <p className="mt-2 text-smoke">{t("intro")}</p>
          </div>
        )}

        <TableActions />

        <OrdersHistory />

        <CampaignsSection locale={locale} />

        <section>
          <h2 className="mb-6 text-xl font-bold text-ink">{t("menuTitle")}</h2>
          <MenuList categories={categories} locale={locale} interactive />
        </section>
      </main>

      <footer className="border-t border-ink/10 bg-paper px-6 py-6">
        <div className="mx-auto max-w-5xl text-center">
          <a
            href={SITE_INSTITUCIONAL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sage underline-offset-4 hover:underline"
          >
            {t("verSite")} →
          </a>
        </div>
      </footer>

      <CartBar />
    </div>
    </MesaOrdersProvider>
  );
}
