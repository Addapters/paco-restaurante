import { AdminNav } from "@/components/admin/AdminNav";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminDefinicoesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="definicoes" />
        <SignOutButton redirectTo="/login-admin" />
      </div>
      <SettingsManager />
    </div>
  );
}
