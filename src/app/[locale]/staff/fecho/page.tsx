import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { CashClosure } from "@/components/staff/CashClosure";

export default async function FechoPage({
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
    .select("role")
    .eq("id", user!.id)
    .single();
  if (!profile || !["staff", "admin"].includes(profile.role)) {
    redirect({
      href: { pathname: "/staff/login", query: { unauthorized: 1 } },
      locale,
    });
  }

  return <CashClosure isAdmin={profile!.role === "admin"} />;
}
