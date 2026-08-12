import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { NewsletterForm } from "./NewsletterForm";

// Rodapé rico: mapa do site, redes sociais, subscrição de newsletter
// (módulo 11) e nota de direitos com o ano atual.
export async function SiteFooter() {
  const [t, settings] = await Promise.all([
    getTranslations("Footer"),
    getSiteSettings(),
  ]);

  const redes = [
    { href: settings.instagram_url, label: "Instagram" },
    { href: settings.facebook_url, label: "Facebook" },
    { href: settings.google_reviews_url, label: t("googleReviews") },
  ].filter((l) => l.href);

  const mapaDoSite = [
    { href: "/#sobre", label: t("sitemap.sobre") },
    { href: "/menu", label: t("sitemap.menu") },
    { href: "/reservas", label: t("sitemap.reservas") },
    { href: "/#localizacao", label: t("sitemap.localizacao") },
  ];

  return (
    <footer className="border-t border-ink/10 bg-paper px-6 py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-10 sm:grid-cols-3">
        <div>
          <p className="font-bold text-ink">Paco Restaurante</p>
          <ul className="mt-3 space-y-1.5">
            {mapaDoSite.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm text-ink/80 underline-offset-4 hover:text-terracotta-dark hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-smoke">
            {t("sitemap.redes")}
          </p>
          <ul className="mt-3 space-y-1.5">
            {redes.length === 0 && (
              <li className="text-sm text-smoke">{t("semLigacoes")}</li>
            )}
            {redes.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sage-dark underline-offset-4 hover:underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <NewsletterForm />
      </div>

      <div className="mx-auto mt-10 max-w-5xl border-t border-ink/10 pt-6 text-center text-xs text-smoke">
        © {new Date().getFullYear()} Paco Restaurante
      </div>
    </footer>
  );
}
