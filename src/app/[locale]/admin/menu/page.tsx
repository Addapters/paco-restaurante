import { AdminNav } from "@/components/admin/AdminNav";
import { MenuManager } from "@/components/admin/MenuManager";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminMenuPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="menu" />
        <SignOutButton redirectTo="/login-admin" />
      </div>
      <MenuManager />
    </div>
  );
}
