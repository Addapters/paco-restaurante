import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui";
import { ReservationForm } from "@/components/reservas/ReservationForm";
import logo from "../../../../public/images/paco-logo.png";

// Fotos placeholder (restaurante e mapa) — substituir quando existirem
// as fotos reais do espaço.
const FOTO_HERO = "https://picsum.photos/seed/paco-reservas/1200/900";
const FOTO_MAPA = "https://picsum.photos/seed/paco-mapa/800/500";

export default async function ReservasPage() {
  const t = await getTranslations("Reservas");

  return (
    <div className="relative min-h-screen bg-cream">
      {/* Topo: imagem de fundo com botão de voltar sobreposto */}
      <div className="relative h-56 w-full sm:h-64">
        <Image
          src={FOTO_HERO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/10" />
        <Link
          href="/"
          aria-label={t("voltar")}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-md backdrop-blur"
        >
          ←
        </Link>
      </div>

      {/* Cartão principal, sobreposto à imagem */}
      <div className="relative z-10 -mt-8 rounded-t-3xl bg-cream px-5 pb-4 pt-6 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:mx-auto sm:max-w-2xl">
        {/* Identidade */}
        <div className="flex items-center gap-3">
          <Image
            src={logo}
            alt="Paco Restaurante"
            className="h-12 w-auto shrink-0"
          />
          <div>
            <h1 className="text-xl font-bold text-ink">Paco Restaurante</h1>
            <p className="text-sm text-smoke">{t("tipoCozinha")}</p>
          </div>
        </div>

        {/* Reservar */}
        <div className="mt-6">
          <h2 className="mb-1 text-lg font-bold text-ink">{t("title")}</h2>
          <p className="mb-5 text-sm text-smoke">{t("subtitle")}</p>
          <ReservationForm />
        </div>

        {/* Localização */}
        <section className="mt-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-smoke">
            {t("localizacao.title")}
          </h2>
          <Card className="overflow-hidden p-0">
            <div className="relative h-36 w-full">
              <Image
                src={FOTO_MAPA}
                alt={t("localizacao.mapaAlt")}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
              />
            </div>
            <div className="space-y-1 p-4 text-sm text-ink">
              <p className="font-semibold">{t("localizacao.morada")}</p>
              <p className="text-smoke">{t("localizacao.moradaPlaceholder")}</p>
              <p className="pt-1 text-smoke">
                {t("localizacao.horarioPlaceholder")}
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
