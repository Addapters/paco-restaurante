import type { Locale } from "@/i18n/routing";
import { requireRole } from "@/lib/auth-guard";
import { AdminNav } from "@/components/admin/AdminNav";
import { CampaignsManager } from "@/components/admin/CampaignsManager";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminCampanhasPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  await requireRole(locale, ["admin"]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="campanhas" />
        <SignOutButton redirectTo="/staff/login" />
      </div>
      <CampaignsManager />
    </div>
  );
}
