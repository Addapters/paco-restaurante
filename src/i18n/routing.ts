import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  // O português fica sem prefixo (/cliente); o inglês usa /en/cliente
  localePrefix: "as-needed",
  // Sem deteção por Accept-Language: quem abre o QR vê sempre PT,
  // e muda para EN com o seletor de idioma.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
