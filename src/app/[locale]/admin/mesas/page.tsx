import { AdminNav } from "@/components/admin/AdminNav";
import { TablesManager } from "@/components/admin/TablesManager";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminMesasPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="mesas" />
        <SignOutButton redirectTo="/login-admin" />
      </div>
      <TablesManager />
    </div>
  );
}
