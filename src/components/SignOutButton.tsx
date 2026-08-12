"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

export function SignOutButton({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("Common");
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleSignOut}>
      {t("sair")}
    </Button>
  );
}
