import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth-guard";
import { AreaShell } from "@/components/AreaShell";

// Toda a área /admin exige sessão com role admin —
// verificado no servidor, aqui no layout.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["admin"], "/login-admin");

  return (
    <AreaShell titleKey="Admin" accentClassName="border-ink">
      {children}
    </AreaShell>
  );
}
