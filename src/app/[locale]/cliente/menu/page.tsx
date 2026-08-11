import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getMenu } from "@/lib/menu";
import { MenuList } from "@/components/menu/MenuList";

export default async function MenuPage({
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
    <div>
      <h2 className="text-2xl font-bold text-ink">{t("title")}</h2>
      <p className="mt-1 mb-8 text-smoke">{t("subtitle")}</p>
      <MenuList categories={categories} locale={locale} />
    </div>
  );
}
