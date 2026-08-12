import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-guard";
import { ReservationsManager } from "@/components/staff/ReservationsManager";

export default async function StaffReservasPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  await requireRole(locale, ["staff", "admin"]);
  const t = await getTranslations("Fecho");

  return (
    <div className="space-y-6">
      <Link
        href="/staff"
        className="text-sm font-medium text-sage-dark underline-offset-4 hover:underline"
      >
        ← {t("voltar")}
      </Link>
      <ReservationsManager />
    </div>
  );
}
