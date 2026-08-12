// PACO.AI — módulo de automações do restaurante.
// Nesta fase é 100% lógica de regras (sem LLM). Cada função é uma
// interface: para introduzir IA no futuro, cria-se uma implementação
// nova (ex.: LlmUpsellEngine que chama a API da Anthropic) e troca-se
// na factory (index.ts) — o resto da aplicação não muda.

import type { MenuCategory, MenuItem } from "@/lib/menu";

// ---------- 1. Upsell ----------
export type MotivoUpsell = "bebida_em_falta" | "destaque_da_categoria";

export interface UpsellSugestao {
  item: MenuItem;
  motivo: MotivoUpsell;
}

export interface UpsellEngine {
  readonly nome: string;
  /** Sugere até 2 itens complementares ao carrinho atual. */
  sugerir(carrinhoItemIds: string[], menu: MenuCategory[]): UpsellSugestao[];
}

// ---------- 2. Encaminhamento do inquérito ----------
export type SurveyDestino = "google_reviews" | "formulario_privado";

export interface SurveyRouter {
  readonly nome: string;
  /** Decide o destino da avaliação (1–5). */
  encaminhar(pontuacao: number): SurveyDestino;
}

// ---------- 3. Secretário do admin ----------
export interface DadosDoDia {
  alertasPorMesa: { numero: number; total: number }[];
  itensEsgotados: string[];
  comentariosNegativos: { pontuacao: number; comentario: string | null }[];
  faturacaoHoje: number;
  faturacaoMedia7d: number;
  pedidosHoje: number;
  pedidosMedia7d: number;
}

export type TipoDestaque = "positivo" | "info" | "aviso" | "alerta";

export interface Destaque {
  tipo: TipoDestaque;
  texto: string;
}

export interface ResumoDiario {
  destaques: Destaque[];
}

export interface DailyBriefEngine {
  readonly nome: string;
  /** Transforma os dados agregados do dia num resumo legível. */
  gerarResumo(dados: DadosDoDia, locale: "pt" | "en"): ResumoDiario;
}
