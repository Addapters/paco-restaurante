import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/components/cliente/AuthForm";
import { AreaShell } from "@/components/AreaShell";

export async function generateMetadata() {
  const t = await getTranslations("ClienteAuth");
  return { title: `${t("login")} — Paco Restaurante` };
}

// Login público de clientes (inclui separador de registo).
export default function LoginPage() {
  return (
    <AreaShell titleKey="Cliente" accentClassName="border-terracotta">
      <AuthForm redirectTo="/cliente" />
    </AreaShell>
  );
}
