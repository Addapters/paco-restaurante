import { Suspense } from "react";
import { LoginForm } from "@/components/staff/LoginForm";
import { AreaShell } from "@/components/AreaShell";

// Rota não publicitada: sem links a partir do site público.
export default function LoginAdminPage() {
  return (
    <AreaShell titleKey="Admin" accentClassName="border-ink">
      <Suspense>
        <LoginForm roles={["admin"]} redirectTo="/admin" titleKey="admin" />
      </Suspense>
    </AreaShell>
  );
}
