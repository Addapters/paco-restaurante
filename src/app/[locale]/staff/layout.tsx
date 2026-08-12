import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth-guard";
import { AreaShell } from "@/components/AreaShell";

// Toda a área /staff exige sessão com role staff ou admin —
// verificado no servidor, aqui no layout.
export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["staff", "admin"], "/login-staff");

  return (
    <AreaShell titleKey="Staff" accentClassName="border-sage">
      {children}
    </AreaShell>
  );
}
