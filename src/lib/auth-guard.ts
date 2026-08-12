import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Guard server-side (usado nos layouts de /staff e /admin): garante
// sessão real (não anónima) com um dos roles exigidos; caso contrário
// redireciona para a página de login da área respetiva.
export async function requireRole(
  locale: Locale,
  roles: Array<"staff" | "admin">,
  loginPath: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    redirect({ href: loginPath, locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nome")
    .eq("id", user!.id)
    .single();
  if (!profile || !(roles as string[]).includes(profile.role)) {
    redirect({
      href: { pathname: loginPath, query: { unauthorized: 1 } },
      locale,
    });
  }

  return { user: user!, profile: profile! };
}
