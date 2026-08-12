import { AdminNav } from "@/components/admin/AdminNav";
import { CampaignsManager } from "@/components/admin/CampaignsManager";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminCampanhasPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="campanhas" />
        <SignOutButton redirectTo="/login-admin" />
      </div>
      <CampaignsManager />
    </div>
  );
}
