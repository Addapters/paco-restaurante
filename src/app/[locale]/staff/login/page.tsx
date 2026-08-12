import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// Rota antiga — o login de staff vive agora em /login-staff.
export default async function StaffLoginRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: "/login-staff", locale });
}
