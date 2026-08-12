import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site-settings";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button, Card } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import logo from "../../../public/images/paco-logo.png";

interface Destaque {
  id: string;
  nome_pt: string;
  nome_en: string;
  preco: number;
  foto_url: string | null;
}

// Landing page pública do restaurante. As áreas internas (staff/admin)
// não têm qualquer link a partir daqui — só o login de clientes.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [t, supabase, settings] = await Promise.all([
    getTranslations("Landing"),
    createClient(),
    getSiteSettings(),
  ]);

  const { data } = await supabase
    .from("menu_items")
    .select("id, nome_pt, nome_en, preco, foto_url")
    .eq("disponivel", true)
    .eq("destaque", true)
    .limit(4);
  const destaques = (data as Destaque[] | null) ?? [];

  const instagram =
    settings.instagram_url ?? "https://www.instagram.com/paco_restaurante";
  const facebook =
    settings.facebook_url ?? "https://www.facebook.com/PacoPilotos";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <header className="relative border-b-4 border-terracotta bg-paper">
        <div className="absolute right-6 top-6">
          <LocaleSwitcher />
        </div>
        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center">
          <Image
            src={logo}
            alt="Paco Restaurante"
            priority
            className="h-44 w-auto"
          />
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-ink">
            Paco Restaurante
          </h1>
          <p className="mt-3 max-w-xl text-lg text-smoke">{t("tagline")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login">
              <Button size="lg">{t("entrar")}</Button>
            </Link>
            <Link href="/cliente/menu">
              <Button size="lg" variant="secondary">
                {t("verMenu")}
              </Button>
            </Link>
            <Link href="/reservas">
              <Button size="lg" variant="outline">
                {t("reservar")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Sobre o Paco */}
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-ink">{t("sobre.title")}</h2>
          <p className="mt-4 leading-relaxed text-ink/80">{t("sobre.texto")}</p>
        </section>

        {/* Destaques do menu */}
        {destaques.length > 0 && (
          <section className="bg-paper px-6 py-16">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-center text-3xl font-bold text-ink">
                {t("destaques.title")}
              </h2>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {destaques.map((item) => (
                  <Card key={item.id} className="overflow-hidden p-0">
                    {item.foto_url && (
                      <div className="relative h-40 w-full">
                        <Image
                          src={item.foto_url}
                          alt={locale === "pt" ? item.nome_pt : item.nome_en}
                          fill
                          sizes="(max-width: 640px) 100vw, 25vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-ink">
                        {locale === "pt" ? item.nome_pt : item.nome_en}
                      </h3>
                      <p className="mt-1 font-bold text-terracotta">
                        {formatPrice(item.preco, locale)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Localização e contacto */}
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold text-ink">
            {t("contacto.title")}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card>
              <ul className="space-y-3 text-sm text-ink">
                <li>
                  <span className="font-semibold">📍 {t("contacto.morada")}: </span>
                  {t("contacto.moradaPlaceholder")}
                </li>
                <li>
                  <span className="font-semibold">🕐 {t("contacto.horario")}: </span>
                  {t("contacto.horarioPlaceholder")}
                </li>
                <li className="flex gap-4 pt-2">
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sage-dark underline-offset-4 hover:underline"
                  >
                    📷 Instagram
                  </a>
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sage-dark underline-offset-4 hover:underline"
                  >
                    📘 Facebook
                  </a>
                </li>
              </ul>
            </Card>
            <Card className="flex min-h-48 items-center justify-center border-dashed">
              <p className="text-sm text-smoke">🗺 {t("contacto.mapa")}</p>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
