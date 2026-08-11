import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  // O português fica sem prefixo (/cliente); o inglês usa /en/cliente
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
