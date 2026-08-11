import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, Card, CardDescription, CardTitle } from "@/components/ui";

export default function ClientePage() {
  const t = useTranslations("Cliente");

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <CardDescription>{t("description")}</CardDescription>
      <Link href="/cliente/menu" className="mt-4 inline-block">
        <Button>{t("verMenu")}</Button>
      </Link>
    </Card>
  );
}
