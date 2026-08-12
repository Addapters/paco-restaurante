import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth-guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminDefinicoesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  await requireRole(locale, ["admin"]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="definicoes" />
        <SignOutButton redirectTo="/staff/login" />
      </div>
      <SettingsManager />
    </div>
  );
}
