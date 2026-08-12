import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// Rota antiga — o login de clientes vive agora em /login.
export default async function ClienteLoginRedirect({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
