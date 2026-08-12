import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

export interface Campaign {
  id: string;
  titulo_pt: string;
  titulo_en: string;
  descricao_pt: string;
  descricao_en: string;
  emoji: string | null;
  imagem_url: string | null;
  valido_de: string | null;
  valido_ate: string | null;
  ativo: boolean;
  ordem: number;
}

// Campanhas geridas pelo admin (/admin/campanhas): mostra apenas as
// ativas e dentro do período de validade.
export async function CampaignsSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("Mesa");
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("ativo", true)
    .or(`valido_de.is.null,valido_de.lte.${hoje}`)
    .or(`valido_ate.is.null,valido_ate.gte.${hoje}`)
    .order("ordem");

  const campanhas = (data as Campaign[] | null) ?? [];
  if (campanhas.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-ink">{t("campanhas")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {campanhas.map((c) => (
          <Card key={c.id} className="overflow-hidden border-sage/40 bg-sage/10 p-0">
            {c.imagem_url && (
              <div className="relative h-32 w-full">
                <Image
                  src={c.imagem_url}
                  alt={locale === "pt" ? c.titulo_pt : c.titulo_en}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <h3 className="mt-2 font-semibold text-ink">
                {locale === "pt" ? c.titulo_pt : c.titulo_en}
              </h3>
              <p className="mt-1 text-sm text-ink/70">
                {locale === "pt" ? c.descricao_pt : c.descricao_en}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
