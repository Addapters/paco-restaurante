import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DadosDoDia,
  DailyBriefEngine,
  Destaque,
  ResumoDiario,
} from "./types";

// ---------- Recolha (server): agrega os dados do dia + média 7 dias ----------
// Recebe o cliente Supabase do chamador (sessão admin, RLS aplicado),
// por isso este módulo continua utilizável em qualquer contexto server.
export async function recolherDadosDoDia(
  supabase: SupabaseClient
): Promise<DadosDoDia> {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const ha7dias = new Date(inicioHoje);
  ha7dias.setDate(ha7dias.getDate() - 7);

  const [
    { data: alertas },
    { data: mesas },
    { data: esgotados },
    { data: inqueritos },
    { data: pagamentosHoje },
    { data: pagamentos7d },
    { count: pedidosHoje },
    { count: pedidos7d },
  ] = await Promise.all([
    supabase
      .from("table_alerts")
      .select("mesa_id")
      .gte("criado_em", inicioHoje.toISOString()),
    supabase.from("restaurant_tables").select("id, numero"),
    supabase.from("menu_items").select("nome_pt").eq("disponivel", false),
    supabase
      .from("satisfaction_surveys")
      .select("pontuacao, comentario")
      .lte("pontuacao", 3)
      .gte("criado_em", inicioHoje.toISOString()),
    supabase
      .from("payments")
      .select("valor")
      .gte("criado_em", inicioHoje.toISOString()),
    supabase
      .from("payments")
      .select("valor")
      .gte("criado_em", ha7dias.toISOString())
      .lt("criado_em", inicioHoje.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("criado_em", inicioHoje.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("criado_em", ha7dias.toISOString())
      .lt("criado_em", inicioHoje.toISOString()),
  ]);

  const numeroDe = new Map(
    ((mesas as { id: string; numero: number }[]) ?? []).map((m) => [
      m.id,
      m.numero,
    ])
  );
  const alertasContagem = new Map<number, number>();
  for (const a of (alertas as { mesa_id: string }[]) ?? []) {
    const numero = numeroDe.get(a.mesa_id);
    if (numero != null) {
      alertasContagem.set(numero, (alertasContagem.get(numero) ?? 0) + 1);
    }
  }

  const soma = (rows: { valor: number }[] | null) =>
    (rows ?? []).reduce((s, r) => s + Number(r.valor), 0);

  return {
    alertasPorMesa: [...alertasContagem.entries()]
      .map(([numero, total]) => ({ numero, total }))
      .sort((a, b) => b.total - a.total),
    itensEsgotados: ((esgotados as { nome_pt: string }[]) ?? []).map(
      (i) => i.nome_pt
    ),
    comentariosNegativos:
      (inqueritos as { pontuacao: number; comentario: string | null }[]) ?? [],
    faturacaoHoje: soma(pagamentosHoje as { valor: number }[] | null),
    faturacaoMedia7d: soma(pagamentos7d as { valor: number }[] | null) / 7,
    pedidosHoje: pedidosHoje ?? 0,
    pedidosMedia7d: (pedidos7d ?? 0) / 7,
  };
}

// ---------- Motor de regras: dados → destaques legíveis ----------
const eur = (v: number, locale: "pt" | "en") =>
  new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(v);

export class RuleBasedDailyBriefEngine implements DailyBriefEngine {
  readonly nome = "regras";

  gerarResumo(dados: DadosDoDia, locale: "pt" | "en"): ResumoDiario {
    const pt = locale === "pt";
    const destaques: Destaque[] = [];

    // Mesas com mais alertas (atenção/espera)
    for (const m of dados.alertasPorMesa.slice(0, 3)) {
      if (m.total >= 2) {
        destaques.push({
          tipo: "alerta",
          texto: pt
            ? `A mesa ${m.numero} pediu atenção ${m.total} vezes hoje — vale a pena perceber porquê.`
            : `Table ${m.numero} called for attention ${m.total} times today — worth looking into.`,
        });
      }
    }

    // Itens esgotados/indisponíveis
    if (dados.itensEsgotados.length > 0) {
      const lista = dados.itensEsgotados.slice(0, 4).join(", ");
      destaques.push({
        tipo: "aviso",
        texto: pt
          ? `${dados.itensEsgotados.length} item(ns) indisponível(is) no menu: ${lista}.`
          : `${dados.itensEsgotados.length} item(s) unavailable on the menu: ${lista}.`,
      });
    }

    // Comentários negativos de hoje
    if (dados.comentariosNegativos.length > 0) {
      const primeiro = dados.comentariosNegativos.find((c) => c.comentario);
      destaques.push({
        tipo: "alerta",
        texto: pt
          ? `${dados.comentariosNegativos.length} avaliação(ões) negativa(s) hoje${
              primeiro?.comentario ? ` — “${primeiro.comentario.slice(0, 120)}”` : ""
            }.`
          : `${dados.comentariosNegativos.length} negative review(s) today${
              primeiro?.comentario ? ` — “${primeiro.comentario.slice(0, 120)}”` : ""
            }.`,
      });
    }

    // Faturação vs média dos últimos 7 dias
    if (dados.faturacaoMedia7d > 0) {
      const variacao =
        ((dados.faturacaoHoje - dados.faturacaoMedia7d) /
          dados.faturacaoMedia7d) *
        100;
      const pct = `${variacao >= 0 ? "+" : ""}${variacao.toFixed(0)}%`;
      destaques.push({
        tipo: variacao >= 15 ? "positivo" : variacao <= -15 ? "aviso" : "info",
        texto: pt
          ? `Faturação de hoje: ${eur(dados.faturacaoHoje, locale)} (${pct} face à média dos últimos 7 dias, ${eur(dados.faturacaoMedia7d, locale)}).`
          : `Today's revenue: ${eur(dados.faturacaoHoje, locale)} (${pct} vs the last 7 days' average of ${eur(dados.faturacaoMedia7d, locale)}).`,
      });
    } else if (dados.faturacaoHoje > 0) {
      destaques.push({
        tipo: "info",
        texto: pt
          ? `Faturação de hoje: ${eur(dados.faturacaoHoje, locale)}.`
          : `Today's revenue: ${eur(dados.faturacaoHoje, locale)}.`,
      });
    }

    // Pedidos vs média
    if (dados.pedidosMedia7d > 0) {
      destaques.push({
        tipo: "info",
        texto: pt
          ? `${dados.pedidosHoje} pedidos hoje (média dos últimos 7 dias: ${dados.pedidosMedia7d.toFixed(1)}/dia).`
          : `${dados.pedidosHoje} orders today (last 7 days' average: ${dados.pedidosMedia7d.toFixed(1)}/day).`,
      });
    }

    if (destaques.length === 0) {
      destaques.push({
        tipo: "info",
        texto: pt
          ? "Dia tranquilo até agora — sem alertas, faltas no menu ou reclamações."
          : "Quiet day so far — no alerts, menu gaps or complaints.",
      });
    }

    return { destaques };
  }
}
