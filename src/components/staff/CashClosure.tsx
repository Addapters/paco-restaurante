"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MetodoPagamento } from "@/lib/invoicing/types";

interface Resumo {
  totalFaturado: number;
  porMetodo: Record<MetodoPagamento, number>;
  numOfertas: number;
  valorOfertas: number;
}

interface Closure {
  id: string;
  data: string;
  valor_caixa: number;
  valor_cofre: number;
  diferencas: number;
  profiles: { nome: string } | null;
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function inicioDoDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function CashClosure({ isAdmin }: { isAdmin: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("Fecho");
  const locale = useLocale() as Locale;

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [fechoDeHoje, setFechoDeHoje] = useState<Closure | null>(null);
  const [historico, setHistorico] = useState<Closure[]>([]);
  const [valorCaixa, setValorCaixa] = useState("");
  const [valorCofre, setValorCofre] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const carregar = useCallback(async () => {
    const inicio = inicioDoDia();
    const [{ data: pagamentos }, { data: ofertas }, { data: fecho }] =
      await Promise.all([
        supabase
          .from("payments")
          .select("metodo, valor")
          .gte("criado_em", inicio),
        supabase
          .from("order_items")
          .select("preco_unitario, quantidade, orders!inner(criado_em)")
          .eq("e_oferta", true)
          .gte("orders.criado_em", inicio),
        supabase
          .from("cash_closures")
          .select("id, data, valor_caixa, valor_cofre, diferencas, profiles(nome)")
          .eq("data", hojeISO())
          .maybeSingle(),
      ]);

    const porMetodo: Record<MetodoPagamento, number> = {
      dinheiro: 0,
      multibanco_tpa: 0,
      parceiro: 0,
    };
    for (const p of (pagamentos ?? []) as { metodo: MetodoPagamento; valor: number }[]) {
      porMetodo[p.metodo] += Number(p.valor);
    }
    const linhasOferta = (ofertas ?? []) as {
      preco_unitario: number;
      quantidade: number;
    }[];

    setResumo({
      totalFaturado:
        porMetodo.dinheiro + porMetodo.multibanco_tpa + porMetodo.parceiro,
      porMetodo,
      numOfertas: linhasOferta.reduce((s, o) => s + o.quantidade, 0),
      valorOfertas: linhasOferta.reduce(
        (s, o) => s + Number(o.preco_unitario) * o.quantidade,
        0
      ),
    });
    setFechoDeHoje((fecho as unknown as Closure) ?? null);

    if (isAdmin) {
      const { data: hist } = await supabase
        .from("cash_closures")
        .select("id, data, valor_caixa, valor_cofre, diferencas, profiles(nome)")
        .order("data", { ascending: false })
        .limit(30);
      setHistorico((hist as unknown as Closure[]) ?? []);
    }
  }, [supabase, isAdmin]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // O sistema só espera encontrar em caixa/cofre o que foi pago em
  // dinheiro; multibanco e parceiros liquidam por via bancária.
  const esperadoDinheiro = resumo?.porMetodo.dinheiro ?? 0;
  const contado = (Number(valorCaixa) || 0) + (Number(valorCofre) || 0);
  const diferenca = contado - esperadoDinheiro;

  async function registarFecho() {
    if (busy) return;
    setBusy(true);
    setError(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("cash_closures").insert({
      data: hojeISO(),
      valor_caixa: Number(valorCaixa) || 0,
      valor_cofre: Number(valorCofre) || 0,
      diferencas: diferenca,
      registado_por: user!.id,
    });
    setBusy(false);
    setConfirmar(false);
    if (err) {
      setError(true);
      return;
    }
    await carregar();
  }

  const metodos: MetodoPagamento[] = ["dinheiro", "multibanco_tpa", "parceiro"];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        <Link
          href="/staff"
          className="text-sm font-medium text-sage-dark underline-offset-4 hover:underline"
        >
          ← {t("voltar")}
        </Link>
      </div>

      {/* 1. Resumo automático do dia */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-smoke">{t("totalFaturado")}</p>
          <p className="mt-1 text-3xl font-bold text-ink">
            {resumo ? formatPrice(resumo.totalFaturado, locale) : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-smoke">{t("porMetodo")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {metodos.map((m) => (
              <li key={m} className="flex justify-between text-ink">
                <span>{t(`metodos.${m}`)}</span>
                <span className="font-semibold">
                  {resumo ? formatPrice(resumo.porMetodo[m], locale) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-sm text-smoke">{t("ofertas")}</p>
          <p className="mt-1 text-3xl font-bold text-ink">
            {resumo?.numOfertas ?? "—"}
          </p>
          <p className="text-sm text-smoke">
            {t("ofertasValor", {
              valor: resumo ? formatPrice(resumo.valorOfertas, locale) : "—",
            })}
          </p>
        </Card>
      </section>

      {/* 2. Contagem e registo do fecho */}
      <section>
        <Card>
          <CardTitle>{t("contagem.title")}</CardTitle>
          {fechoDeHoje ? (
            <div className="mt-3 space-y-1 text-sm text-ink">
              <p className="font-medium text-sage-dark">
                ✓ {t("contagem.jaFechado")}
              </p>
              <p>
                {t("contagem.caixa")}:{" "}
                {formatPrice(fechoDeHoje.valor_caixa, locale)} ·{" "}
                {t("contagem.cofre")}:{" "}
                {formatPrice(fechoDeHoje.valor_cofre, locale)}
              </p>
              <p
                className={cn(
                  "font-semibold",
                  fechoDeHoje.diferencas === 0
                    ? "text-sage-dark"
                    : "text-terracotta-dark"
                )}
              >
                {t("contagem.diferenca")}:{" "}
                {formatPrice(fechoDeHoje.diferencas, locale)}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-smoke">{t("contagem.nota")}</p>
              <div className="flex flex-wrap gap-4">
                <div className="w-40">
                  <Input
                    id="caixa"
                    type="number"
                    step="0.01"
                    min="0"
                    label={t("contagem.caixa")}
                    value={valorCaixa}
                    onChange={(e) => setValorCaixa(e.target.value)}
                  />
                </div>
                <div className="w-40">
                  <Input
                    id="cofre"
                    type="number"
                    step="0.01"
                    min="0"
                    label={t("contagem.cofre")}
                    value={valorCofre}
                    onChange={(e) => setValorCofre(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg bg-cream p-4 text-sm text-ink">
                <div className="flex justify-between">
                  <span>{t("contagem.esperado")}</span>
                  <span className="font-semibold">
                    {formatPrice(esperadoDinheiro, locale)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("contagem.contado")}</span>
                  <span className="font-semibold">
                    {formatPrice(contado, locale)}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-1 flex justify-between border-t border-ink/10 pt-1 font-bold",
                    diferenca === 0 ? "text-sage-dark" : "text-terracotta-dark"
                  )}
                >
                  <span>{t("contagem.diferenca")}</span>
                  <span>{formatPrice(diferenca, locale)}</span>
                </div>
              </div>

              {error && (
                <p className="text-sm font-medium text-terracotta-dark">
                  {t("contagem.erro")}
                </p>
              )}

              {confirmar ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-medium text-ink">
                    {t("contagem.confirmarPergunta", {
                      diferenca: formatPrice(diferenca, locale),
                    })}
                  </p>
                  <Button onClick={registarFecho} disabled={busy}>
                    {busy
                      ? t("contagem.aRegistar")
                      : t("contagem.confirmarSim")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmar(false)}
                    disabled={busy}
                  >
                    {t("contagem.cancelar")}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setConfirmar(true)}
                  disabled={valorCaixa === "" && valorCofre === ""}
                >
                  {t("contagem.registar")}
                </Button>
              )}
            </div>
          )}
        </Card>
      </section>

      {/* 3. Histórico (admin) */}
      {isAdmin && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-ink">
            {t("historico.title")}
          </h2>
          {historico.length === 0 ? (
            <p className="text-smoke">{t("historico.vazio")}</p>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-smoke">
                    <th className="px-4 py-3 font-medium">
                      {t("historico.data")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("contagem.caixa")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("contagem.cofre")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("contagem.diferenca")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("historico.registadoPor")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((fecho) => (
                    <tr key={fecho.id} className="border-b border-ink/5 text-ink">
                      <td className="px-4 py-3">
                        {new Date(fecho.data + "T00:00:00").toLocaleDateString(
                          locale === "pt" ? "pt-PT" : "en-GB"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatPrice(fecho.valor_caixa, locale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatPrice(fecho.valor_cofre, locale)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold",
                          fecho.diferencas === 0
                            ? "text-sage-dark"
                            : "text-terracotta-dark"
                        )}
                      >
                        {formatPrice(fecho.diferencas, locale)}
                      </td>
                      <td className="px-4 py-3">
                        {fecho.profiles?.nome ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
