import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ReservationsManager } from "@/components/staff/ReservationsManager";

// O acesso é garantido pelo guard no layout de /staff.
export default async function StaffReservasPage() {
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
