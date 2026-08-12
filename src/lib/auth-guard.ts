import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Guard de página server-side: garante sessão real (não anónima) com um
// dos roles exigidos; caso contrário redireciona para o login de staff.
export async function requireRole(
  locale: Locale,
  roles: Array<"staff" | "admin">
) {
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
  if (!profile || !(roles as string[]).includes(profile.role)) {
    redirect({
      href: { pathname: "/staff/login", query: { unauthorized: 1 } },
      locale,
    });
  }

  return { user: user!, profile: profile! };
}
