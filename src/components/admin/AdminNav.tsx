import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "dashboard", href: "/admin" },
  { key: "menu", href: "/admin/menu" },
  { key: "campanhas", href: "/admin/campanhas" },
  { key: "mesas", href: "/admin/mesas" },
  { key: "definicoes", href: "/admin/definicoes" },
] as const;

export function AdminNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  const t = useTranslations("AdminArea.nav");
  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-ink/10 bg-paper p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-ink text-white"
              : "text-ink hover:bg-ink/5"
          )}
        >
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
