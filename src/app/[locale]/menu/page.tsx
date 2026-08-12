import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMenu } from "@/lib/menu";
import { MenuList } from "@/components/menu/MenuList";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";

export async function generateMetadata() {
  const t = await getTranslations("Menu");
  return { title: `${t("title")} — Paco Restaurante` };
}

// Menu público, só de leitura — não exige login. Serve para quem quer
// ver os pratos antes de reservar ou visitar o restaurante.
export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [t, categories] = await Promise.all([
    getTranslations("Menu"),
    getMenu(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav transparentAtTop={false} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-16 pt-28">
        <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
        <p className="mt-1 mb-8 text-smoke">{t("subtitle")}</p>
        <MenuList categories={categories} locale={locale} />
      </main>
      <SiteFooter />
    </div>
  );
}
