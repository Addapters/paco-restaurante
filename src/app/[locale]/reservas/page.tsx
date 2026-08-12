import { getTranslations } from "next-intl/server";
import { ReservationForm } from "@/components/reservas/ReservationForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default async function ReservasPage() {
  const [t, tCommon] = await Promise.all([
    getTranslations("Reservas"),
    getTranslations("Common"),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-4 border-sage bg-paper px-6 py-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <span className="font-bold text-ink">{tCommon("appName")}</span>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="mb-2 text-center text-3xl font-bold text-ink">
          {t("title")}
        </h1>
        <p className="mb-8 text-center text-smoke">{t("subtitle")}</p>
        <ReservationForm />
      </main>
      <SiteFooter />
    </div>
  );
}
