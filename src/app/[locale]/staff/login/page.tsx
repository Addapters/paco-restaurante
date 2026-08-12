import { Suspense } from "react";
import { LoginForm } from "@/components/staff/LoginForm";

export default function StaffLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
