import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffDashboard } from "@/components/staff/StaffDashboard";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui";

// O acesso é garantido pelo guard no layout de /staff.
export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user!.id)
    .single();

  const [t, tStaff] = await Promise.all([
    getTranslations("Fecho"),
    getTranslations("StaffPanel"),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-smoke">{profile?.nome}</p>
        <div className="flex items-center gap-2">
          <Link href="/staff/reservas">
            <Button variant="outline" size="sm">
              🗓 {tStaff("reservas.title")}
            </Button>
          </Link>
          <Link href="/staff/fecho">
            <Button variant="outline" size="sm">
              💶 {t("title")}
            </Button>
          </Link>
          <SignOutButton redirectTo="/login-staff" />
        </div>
      </div>
      <StaffDashboard />
    </div>
  );
}
