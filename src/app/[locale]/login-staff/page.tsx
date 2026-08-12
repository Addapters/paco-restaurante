import { Suspense } from "react";
import { LoginForm } from "@/components/staff/LoginForm";
import { AreaShell } from "@/components/AreaShell";

// Rota não publicitada: sem links a partir do site público.
export default function LoginStaffPage() {
  return (
    <AreaShell titleKey="Staff" accentClassName="border-sage">
      <Suspense>
        <LoginForm roles={["staff", "admin"]} redirectTo="/staff" titleKey="staff" />
      </Suspense>
    </AreaShell>
  );
}
