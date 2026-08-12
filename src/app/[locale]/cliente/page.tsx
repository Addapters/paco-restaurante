import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, CardDescription, CardTitle } from "@/components/ui";

export default async function ClientePage() {
  const [t, supabase] = await Promise.all([
    getTranslations("Cliente"),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const autenticado = !!user && !user.is_anonymous;

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <CardDescription>{t("description")}</CardDescription>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/cliente/menu">
          <Button>{t("verMenu")}</Button>
        </Link>
        <Link href={autenticado ? "/cliente/perfil" : "/cliente/login"}>
          <Button variant="secondary">
            {autenticado ? t("oMeuPerfil") : t("entrarRegistar")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
