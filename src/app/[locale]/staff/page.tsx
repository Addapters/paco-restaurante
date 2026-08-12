import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { StaffDashboard } from "@/components/staff/StaffDashboard";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    redirect({ href: "/staff/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user!.id)
    .single();
  if (!profile || !["staff", "admin"].includes(profile.role)) {
    redirect({
      href: { pathname: "/staff/login", query: { unauthorized: 1 } },
      locale,
    });
  }

  const t = await getTranslations("Fecho");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-smoke">{profile!.nome}</p>
        <div className="flex items-center gap-2">
          <Link href="/staff/fecho">
            <Button variant="outline" size="sm">
              💶 {t("title")}
            </Button>
          </Link>
          <SignOutButton redirectTo="/staff/login" />
        </div>
      </div>
      <StaffDashboard />
    </div>
  );
}
