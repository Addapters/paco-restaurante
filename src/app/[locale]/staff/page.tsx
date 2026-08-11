import { useTranslations } from "next-intl";
import { Card, CardDescription, CardTitle } from "@/components/ui";

export default function StaffPage() {
  const t = useTranslations("Staff");

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <CardDescription>{t("description")}</CardDescription>
    </Card>
  );
}
