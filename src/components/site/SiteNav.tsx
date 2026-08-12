"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import logo from "../../../public/images/paco-logo.png";

// Nav fixo no topo. Sobre o hero da homepage começa transparente (o
// texto vai a branco, legível sobre a foto); ao passar da faixa do
// hero — ou em páginas sem hero (transparentAtTop=false) — ganha fundo
// bege translúcido com desfoque, como qualquer nav de site "normal".
export function SiteNav({
  transparentAtTop = true,
}: {
  transparentAtTop?: boolean;
}) {
  const t = useTranslations("Landing.nav");
  const tLanding = useTranslations("Landing");
  const [scrolled, setScrolled] = useState(!transparentAtTop);

  useEffect(() => {
    if (!transparentAtTop) return;
    function onScroll() {
      setScrolled(window.scrollY > 48);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparentAtTop]);

  const linkClass = cn(
    "text-sm font-medium transition-colors",
    scrolled ? "text-ink hover:text-terracotta-dark" : "text-white/90 hover:text-white"
  );

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-cream/90 shadow-sm backdrop-blur-md"
          : // Barra translúcida uniforme (não gradiente): garante
            // contraste do texto claro mesmo sobre zonas claras da foto
            "bg-ink/40 backdrop-blur-[2px]"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src={logo} alt="Paco Restaurante" className="h-9 w-auto" />
          <span
            className={cn(
              "font-bold",
              scrolled ? "text-ink" : "text-white drop-shadow-sm"
            )}
          >
            Paco Restaurante
          </span>
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/#sobre" className={linkClass}>
            {t("sobre")}
          </Link>
          <Link href="/menu" className={linkClass}>
            {t("menu")}
          </Link>
          <Link href="/#localizacao" className={linkClass}>
            {t("localizacao")}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-paper/90 backdrop-blur-sm">
            <LocaleSwitcher />
          </div>
          <Link href="/login">
            <Button size="sm" variant="secondary">
              {tLanding("entrar")}
            </Button>
          </Link>
          <Link href="/reservas">
            <Button size="sm">{tLanding("reservar")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
