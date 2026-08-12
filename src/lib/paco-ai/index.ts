// PACO.AI — factories.
// Para introduzir um LLM numa fase futura, cria-se a implementação
// (ex.: LlmUpsellEngine) e troca-se aqui — possivelmente controlado por
// uma variável de ambiente (PACO_AI_ENGINE=llm) — sem alterar quem chama.
// Este módulo é seguro tanto no servidor como no browser; apenas a
// recolha de dados do resumo diário (recolherDadosDoDia) exige um
// cliente Supabase com sessão, fornecido pelo chamador.

import { RuleBasedUpsellEngine } from "./upsell";
import { RuleBasedSurveyRouter } from "./survey-router";
import { RuleBasedDailyBriefEngine } from "./daily-brief";
import type { DailyBriefEngine, SurveyRouter, UpsellEngine } from "./types";

export type {
  DadosDoDia,
  DailyBriefEngine,
  Destaque,
  MotivoUpsell,
  ResumoDiario,
  SurveyDestino,
  SurveyRouter,
  TipoDestaque,
  UpsellEngine,
  UpsellSugestao,
} from "./types";
export { recolherDadosDoDia } from "./daily-brief";

export function getUpsellEngine(): UpsellEngine {
  return new RuleBasedUpsellEngine();
}

export function getSurveyRouter(): SurveyRouter {
  return new RuleBasedSurveyRouter();
}

export function getDailyBriefEngine(): DailyBriefEngine {
  return new RuleBasedDailyBriefEngine();
}
