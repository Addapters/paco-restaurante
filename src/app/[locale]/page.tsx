import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button, Card, CardDescription, CardTitle } from "@/components/ui";

const areas = [
  { key: "cliente", href: "/cliente" },
  { key: "staff", href: "/staff" },
  { key: "admin", href: "/admin" },
] as const;

export default function HomePage() {
  const t = useTranslations("Home");

  return (
    <>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-2 text-smoke">{t("subtitle")}</p>
          </div>
          <LocaleSwitcher />
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {areas.map(({ key, href }) => (
            <Card key={key} className="flex flex-col">
              <CardTitle>{t(`areas.${key}.title`)}</CardTitle>
              <CardDescription className="flex-1">
                {t(`areas.${key}.description`)}
              </CardDescription>
              <Link href={href} className="mt-4">
                <Button
                  className="w-full"
                  variant={key === "cliente" ? "primary" : "secondary"}
                >
                  {t("enter")}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
