import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { cn } from "@/lib/utils";

// Estrutura comum às três áreas (cliente, staff, admin) — cada layout
// define apenas o título e a cor de destaque da sua barra superior.
export function AreaShell({
  titleKey,
  accentClassName,
  children,
}: {
  titleKey: "Cliente" | "Staff" | "Admin";
  accentClassName: string;
  children: React.ReactNode;
}) {
  const t = useTranslations(titleKey);
  const tCommon = useTranslations("Common");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header
        className={cn(
          "border-b-4 bg-paper px-6 py-4 shadow-sm",
          accentClassName
        )}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Link href="/" className="font-bold text-ink hover:opacity-70">
              {tCommon("appName")}
            </Link>
            <span className="text-sm text-smoke">{t("title")}</span>
          </div>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
