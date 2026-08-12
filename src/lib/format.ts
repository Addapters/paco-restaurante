import type { Locale } from "@/i18n/routing";

export function formatPrice(preco: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(preco);
}
