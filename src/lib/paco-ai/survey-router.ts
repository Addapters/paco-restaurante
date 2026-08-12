import type { SurveyDestino, SurveyRouter } from "./types";

// A partir de 4 estrelas a experiência é considerada positiva e o
// cliente é convidado a avaliar publicamente; abaixo disso a mensagem
// segue em privado para a gerência. (Lógica centralizada do módulo 5;
// no futuro pode pesar também o histórico do cliente ou o texto.)
const LIMIAR_POSITIVO = 4;

export class RuleBasedSurveyRouter implements SurveyRouter {
  readonly nome = "regras";

  encaminhar(pontuacao: number): SurveyDestino {
    return pontuacao >= LIMIAR_POSITIVO
      ? "google_reviews"
      : "formulario_privado";
  }
}
