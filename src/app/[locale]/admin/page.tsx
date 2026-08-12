import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  getDailyBriefEngine,
  recolherDadosDoDia,
  type TipoDestaque,
} from "@/lib/paco-ai";
import { AdminNav } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/SignOutButton";
import { Card, CardTitle } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Barra {
  label: string;
  valor: number;
}

// Barras horizontais de série única (uma cor por gráfico, rótulos em
// texto) — sem eixos pesados, valores diretos à direita.
function BarList({
  data,
  cor,
  formatar,
}: {
  data: Barra[];
  cor: string;
  formatar(valor: number): string;
}) {
  const max = Math.max(...data.map((d) => d.valor), 1);
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3">
          <span className="truncate text-sm text-smoke">{d.label}</span>
          <span className="h-4 overflow-hidden rounded-r"
            aria-hidden="true"
          >
            <span
              className={cn("block h-full rounded-r", cor)}
              style={{ width: `${(d.valor / max) * 100}%` }}
            />
          </span>
          <span className="text-sm font-semibold text-ink tabular-nums">
            {formatar(d.valor)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const t = await getTranslations("AdminArea.dashboard");
  const supabase = await createClient();

  // PACO.AI — resumo diário do "secretário" (regras, sem LLM nesta fase)
  const resumo = getDailyBriefEngine().gerarResumo(
    await recolherDadosDoDia(supabase),
    locale
  );

  const umAnoAtras = new Date();
  umAnoAtras.setMonth(umAnoAtras.getMonth() - 11);
  umAnoAtras.setDate(1);

  const [
    { data: pagamentos },
    { data: itens },
    { data: pedidos },
    { data: inqueritos },
    { data: fechos },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("valor, criado_em")
      .gte("criado_em", umAnoAtras.toISOString()),
    supabase
      .from("order_items")
      .select("quantidade, e_oferta, menu_items(nome_pt, nome_en)"),
    supabase.from("orders").select("origem"),
    supabase
      .from("satisfaction_surveys")
      .select("pontuacao, comentario, encaminhado_para, criado_em")
      .order("criado_em", { ascending: false }),
    supabase
      .from("cash_closures")
      .select("data, valor_caixa, valor_cofre, diferencas")
      .order("data", { ascending: false })
      .limit(12),
  ]);

  // Faturação por mês (últimos 12 meses, meses sem vendas incluídos)
  const meses: Barra[] = [];
  const porMes = new Map<string, number>();
  for (const p of pagamentos ?? []) {
    const chave = p.criado_em.slice(0, 7);
    porMes.set(chave, (porMes.get(chave) ?? 0) + Number(p.valor));
  }
  const cursor = new Date(umAnoAtras);
  const agora = new Date();
  while (cursor <= agora) {
    const chave = cursor.toISOString().slice(0, 7);
    meses.push({
      label: cursor.toLocaleDateString(locale === "pt" ? "pt-PT" : "en-GB", {
        month: "short",
        year: "2-digit",
      }),
      valor: porMes.get(chave) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const totalAno = meses.reduce((s, m) => s + m.valor, 0);

  // Pratos mais vendidos
  const porPrato = new Map<string, number>();
  for (const i of (itens ?? []) as unknown as {
    quantidade: number;
    menu_items: { nome_pt: string; nome_en: string } | null;
  }[]) {
    if (!i.menu_items) continue;
    const nome = locale === "pt" ? i.menu_items.nome_pt : i.menu_items.nome_en;
    porPrato.set(nome, (porPrato.get(nome) ?? 0) + i.quantidade);
  }
  const topPratos: Barra[] = [...porPrato.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  // Pedidos por origem
  const origens = ["mesa", "uber_informativo", "thefork_informativo", "outro"] as const;
  const porOrigem: Barra[] = origens.map((o) => ({
    label: t(`origens.${o}`),
    valor: (pedidos ?? []).filter((p) => p.origem === o).length,
  }));

  // Inquéritos de satisfação
  const respostas = (inqueritos ?? []) as {
    pontuacao: number;
    comentario: string | null;
    encaminhado_para: string;
    criado_em: string;
  }[];
  const media =
    respostas.length > 0
      ? respostas.reduce((s, r) => s + r.pontuacao, 0) / respostas.length
      : null;
  const distribuicao: Barra[] = [5, 4, 3, 2, 1].map((n) => ({
    label: "★".repeat(n),
    valor: respostas.filter((r) => r.pontuacao === n).length,
  }));
  const comentariosPrivados = respostas
    .filter((r) => r.encaminhado_para === "formulario_privado" && r.comentario)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <AdminNav active="dashboard" />
        <SignOutButton redirectTo="/login-admin" />
      </div>

      <section>
        <Card className="border-sage/50 bg-sage/5">
          <CardTitle>{t("pacoAi.title")}</CardTitle>
          <p className="mt-1 text-xs text-smoke">{t("pacoAi.subtitle")}</p>
          <ul className="mt-4 space-y-2">
            {resumo.destaques.map((d, i) => (
              <li
                key={i}
                className={cn(
                  "flex gap-2 rounded-lg p-3 text-sm",
                  (
                    {
                      alerta: "bg-terracotta/10 text-terracotta-dark",
                      aviso: "bg-terracotta/5 text-ink",
                      positivo: "bg-sage/15 text-sage-dark",
                      info: "bg-cream text-ink",
                    } as Record<TipoDestaque, string>
                  )[d.tipo]
                )}
              >
                {d.texto}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("faturacaoMensal")}</CardTitle>
          <p className="mt-1 text-3xl font-bold text-ink">
            {formatPrice(totalAno, locale)}
          </p>
          <p className="text-sm text-smoke">{t("ultimos12Meses")}</p>
          <div className="mt-4">
            <BarList
              data={meses}
              cor="bg-terracotta"
              formatar={(v) => formatPrice(v, locale)}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>{t("maisVendidos")}</CardTitle>
          <div className="mt-4">
            {topPratos.length === 0 ? (
              <p className="text-sm text-smoke">{t("semDados")}</p>
            ) : (
              <BarList
                data={topPratos}
                cor="bg-sage"
                formatar={(v) => `${v}×`}
              />
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{t("pedidosPorOrigem")}</CardTitle>
          <div className="mt-4">
            <BarList
              data={porOrigem}
              cor="bg-ink"
              formatar={(v) => String(v)}
            />
          </div>
        </Card>

        <Card>
          <CardTitle>{t("satisfacao")}</CardTitle>
          {media == null ? (
            <p className="mt-4 text-sm text-smoke">{t("semDados")}</p>
          ) : (
            <>
              <p className="mt-1 text-3xl font-bold text-ink">
                {media.toFixed(1)} ★
                <span className="ml-2 text-sm font-normal text-smoke">
                  {t("nRespostas", { count: respostas.length })}
                </span>
              </p>
              <div className="mt-4">
                <BarList
                  data={distribuicao}
                  cor="bg-terracotta"
                  formatar={(v) => String(v)}
                />
              </div>
              {comentariosPrivados.length > 0 && (
                <div className="mt-4 border-t border-ink/10 pt-3">
                  <p className="mb-2 text-sm font-medium text-ink">
                    {t("comentariosPrivados")}
                  </p>
                  <ul className="space-y-2">
                    {comentariosPrivados.map((c, i) => (
                      <li key={i} className="rounded-lg bg-cream p-3 text-sm text-ink/80">
                        “{c.comentario}”
                        <span className="mt-1 block text-xs text-smoke">
                          {c.pontuacao}★ ·{" "}
                          {new Date(c.criado_em).toLocaleDateString(
                            locale === "pt" ? "pt-PT" : "en-GB"
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>
      </section>

      <section>
        <Card>
          <CardTitle>{t("fechos")}</CardTitle>
          {(fechos ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-smoke">{t("semDados")}</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-smoke">
                  <th className="py-2 font-medium">{t("data")}</th>
                  <th className="py-2 text-right font-medium">{t("caixa")}</th>
                  <th className="py-2 text-right font-medium">{t("cofre")}</th>
                  <th className="py-2 text-right font-medium">{t("diferenca")}</th>
                </tr>
              </thead>
              <tbody>
                {(fechos ?? []).map((f) => (
                  <tr key={f.data} className="border-b border-ink/5 text-ink">
                    <td className="py-2">
                      {new Date(f.data + "T00:00:00").toLocaleDateString(
                        locale === "pt" ? "pt-PT" : "en-GB"
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPrice(f.valor_caixa, locale)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatPrice(f.valor_cofre, locale)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-semibold tabular-nums",
                        f.diferencas === 0 ? "text-sage-dark" : "text-terracotta-dark"
                      )}
                    >
                      {formatPrice(f.diferencas, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
