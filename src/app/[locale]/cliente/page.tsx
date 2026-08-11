import { useTranslations } from "next-intl";
import { Card, CardDescription, CardTitle } from "@/components/ui";

export default function ClientePage() {
  const t = useTranslations("Cliente");

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <CardDescription>{t("description")}</CardDescription>
    </Card>
  );
}
