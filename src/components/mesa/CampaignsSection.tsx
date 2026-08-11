import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { campaigns } from "@/data/campaigns";
import { Card } from "@/components/ui";

export function CampaignsSection({ locale }: { locale: Locale }) {
  const t = useTranslations("Mesa");

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-ink">{t("campanhas")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="border-sage/40 bg-sage/10 p-4">
            <div className="text-2xl">{c.emoji}</div>
            <h3 className="mt-2 font-semibold text-ink">
              {locale === "pt" ? c.titulo_pt : c.titulo_en}
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              {locale === "pt" ? c.descricao_pt : c.descricao_en}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
