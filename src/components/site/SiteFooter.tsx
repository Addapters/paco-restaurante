import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { NewsletterForm } from "./NewsletterForm";

// Rodapé informativo: avaliações Google, redes sociais (configuráveis
// em /admin/definicoes) e subscrição de newsletter.
export async function SiteFooter() {
  const [t, settings] = await Promise.all([
    getTranslations("Footer"),
    getSiteSettings(),
  ]);

  const ligacoes = [
    { href: settings.google_reviews_url, label: `${t("googleReviews")}` },
    { href: settings.instagram_url, label: "Instagram" },
    { href: settings.facebook_url, label: "Facebook" },
  ].filter((l) => l.href);

  return (
    <footer className="border-t border-ink/10 bg-paper px-6 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8 sm:grid-cols-2">
        <div>
          <p className="font-bold text-ink">Paco Restaurante</p>
          <ul className="mt-2 space-y-1">
            {ligacoes.length === 0 && (
              <li className="text-sm text-smoke">{t("semLigacoes")}</li>
            )}
            {ligacoes.map((l) => (
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
            <li>
              <Link
                href="/reservas"
                className="text-sm text-sage-dark underline-offset-4 hover:underline"
              >
                {t("reservar")}
              </Link>
            </li>
          </ul>
        </div>
        <NewsletterForm />
      </div>
    </footer>
  );
}
