import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { MenuCategory, MenuItem } from "@/lib/menu";
import { Card } from "@/components/ui";
import { AddToCartButton } from "@/components/mesa/AddToCartButton";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function MenuItemCard({
  item,
  locale,
  interactive,
}: {
  item: MenuItem;
  locale: Locale;
  interactive: boolean;
}) {
  const t = useTranslations("Menu");
  const nome = locale === "pt" ? item.nome_pt : item.nome_en;
  const descricao = locale === "pt" ? item.descricao_pt : item.descricao_en;

  return (
    <Card
      className={cn(
        "flex gap-4 p-4",
        item.destaque && "border-terracotta ring-1 ring-terracotta/40"
      )}
    >
      {item.foto_url && (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={item.foto_url}
            alt={nome}
            fill
            sizes="96px"
            className="object-cover"
            // Ficheiros locais: contorna um bug do otimizador de imagens
            // da Vercel que troca bytes entre pedidos concorrentes
            unoptimized={item.foto_url.startsWith("/")}
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold text-ink">{nome}</h4>
          <span className="shrink-0 font-semibold text-terracotta">
            {formatPrice(item.preco, locale)}
          </span>
        </div>
        {item.destaque && (
          <span className="mt-1 w-fit rounded-full bg-terracotta px-2 py-0.5 text-xs font-medium text-white">
            {t("destaque")}
          </span>
        )}
        <p className="mt-1 text-sm text-smoke">{descricao}</p>
        {interactive && (
          <AddToCartButton
            item={{
              itemId: item.id,
              nome_pt: item.nome_pt,
              nome_en: item.nome_en,
              preco: item.preco,
            }}
          />
        )}
      </div>
    </Card>
  );
}

export function MenuList({
  categories,
  locale,
  interactive = false,
}: {
  categories: MenuCategory[];
  locale: Locale;
  interactive?: boolean;
}) {
  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <section key={cat.id}>
          <h3 className="mb-4 border-b-2 border-sage pb-2 text-xl font-bold text-ink">
            {locale === "pt" ? cat.nome_pt : cat.nome_en}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {cat.menu_items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                locale={locale}
                interactive={interactive}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
