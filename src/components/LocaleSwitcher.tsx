"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-ink/15 p-0.5">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors",
            l === locale
              ? "bg-ink text-white"
              : "text-ink hover:bg-ink/10"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
