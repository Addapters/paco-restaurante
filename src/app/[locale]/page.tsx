import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getSiteSettings } from "@/lib/site-settings";
import { SiteNav } from "@/components/site/SiteNav";
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

interface Testemunho {
  nome: string;
  texto: string;
  estrelas: number;
}

// Fotos placeholder (Pexels, licença livre de direitos — verificadas
// antes de usar) até existirem fotografias reais do espaço/pratos.
const FOTO_HERO =
  "https://images.pexels.com/photos/6872197/pexels-photo-6872197.jpeg?auto=compress&cs=tinysrgb&w=1920";
const FOTO_SOBRE =
  "https://images.pexels.com/photos/30457533/pexels-photo-30457533.jpeg?auto=compress&cs=tinysrgb&w=1200";

const GOOGLE_REVIEWS_FALLBACK =
  "https://www.google.com/maps/search/paco+restaurante";

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
    .limit(8);
  const destaques = (data as Destaque[] | null) ?? [];

  const instagram =
    settings.instagram_url ?? "https://www.instagram.com/paco_restaurante";
  const facebook =
    settings.facebook_url ?? "https://www.facebook.com/PacoPilotos";
  const googleReviews = settings.google_reviews_url ?? GOOGLE_REVIEWS_FALLBACK;

  const testemunhos = t.raw("testemunhos.itens") as Testemunho[];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      {/* Hero */}
      <header className="relative flex min-h-[88vh] items-center overflow-hidden">
        <Image
          src={FOTO_HERO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/45 to-ink/25" />
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 text-center">
          <Image
            src={logo}
            alt="Paco Restaurante"
            className="h-28 w-auto drop-shadow-lg"
          />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl">
            {t("hero.titulo")}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90">{t("tagline")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/reservas">
              <Button size="lg">{t("reservar")}</Button>
            </Link>
            <Link href="/menu">
              <Button size="lg" variant="outlineLight">
                {t("verMenu")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Sobre o Paco */}
        <section
          id="sobre"
          className="mx-auto grid max-w-5xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center"
        >
          <div>
            <h2 className="text-3xl font-bold text-ink">{t("sobre.title")}</h2>
            <p className="mt-4 leading-relaxed text-ink/80">
              {t("sobre.texto")}
            </p>
          </div>
          <div className="relative h-64 overflow-hidden rounded-2xl shadow-md sm:h-80">
            <Image
              src={FOTO_SOBRE}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </section>

        {/* Destaques do menu */}
        {destaques.length > 0 && (
          <section id="menu-destaques" className="bg-paper px-6 py-20">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-center text-3xl font-bold text-ink">
                {t("destaques.title")}
              </h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {destaques.map((item) => (
                  <Link key={item.id} href="/menu">
                    <Card className="h-full overflow-hidden p-0 transition-transform hover:-translate-y-1 hover:shadow-md">
                      {item.foto_url && (
                        <div className="relative h-40 w-full">
                          <Image
                            src={item.foto_url}
                            alt={locale === "pt" ? item.nome_pt : item.nome_en}
                            fill
                            sizes="(max-width: 640px) 100vw, 25vw"
                            className="object-cover"
                            // Ficheiros locais: contorna um bug do otimizador de
                            // imagens da Vercel que troca bytes entre pedidos concorrentes
                            unoptimized={item.foto_url.startsWith("/")}
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
                  </Link>
                ))}
              </div>
              <div className="mt-10 text-center">
                <Link href="/menu">
                  <Button variant="outline" size="lg">
                    {t("destaques.verMenu")}
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Testemunhos */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold text-ink">
            {t("testemunhos.title")}
          </h2>
          <p className="mt-6 text-center text-xs text-smoke">
            {t("testemunhos.nota")}
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {testemunhos.map((dep, i) => (
              <Card key={i}>
                <p className="text-terracotta" aria-hidden="true">
                  {"★".repeat(dep.estrelas)}
                </p>
                <p className="mt-3 text-sm italic text-ink/80">
                  &ldquo;{dep.texto}&rdquo;
                </p>
                <p className="mt-4 text-sm font-semibold text-ink">
                  {dep.nome}
                </p>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center">
            <a
              href={googleReviews}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sage-dark underline-offset-4 hover:underline"
            >
              {t("testemunhos.verTodas")} →
            </a>
          </p>
        </section>

        {/* Localização e contacto */}
        <section id="localizacao" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold text-ink">
            {t("contacto.title")}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Card>
              <ul className="space-y-3 text-sm text-ink">
                <li>
                  <span className="font-semibold">{t("contacto.morada")}: </span>
                  {t("contacto.moradaPlaceholder")}
                </li>
                <li>
                  <span className="font-semibold">{t("contacto.horario")}: </span>
                  {t("contacto.horarioPlaceholder")}
                </li>
                <li className="flex gap-4 pt-2">
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sage-dark underline-offset-4 hover:underline"
                  >
                    Instagram
                  </a>
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sage-dark underline-offset-4 hover:underline"
                  >
                    Facebook
                  </a>
                </li>
              </ul>
            </Card>
            <Card className="flex min-h-48 items-center justify-center border-dashed">
              <p className="text-sm text-smoke">{t("contacto.mapa")}</p>
            </Card>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
