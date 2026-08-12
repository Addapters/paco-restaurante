// Configuração do horário de reservas. Fase atual: constantes no
// código; uma gestão de capacidade por horário configurável pelo
// admin fica para uma fase futura.

export interface FaixaHoraria {
  inicio: string; // "HH:MM"
  fim: string; // "HH:MM" (exclusivo)
}

export const FAIXAS_HORARIAS: FaixaHoraria[] = [
  { inicio: "12:00", fim: "15:00" }, // almoço
  { inicio: "19:00", fim: "22:00" }, // jantar
];

export const INTERVALO_MINUTOS = 30;

// Aproximação simples: nº máximo de reservas aceites no mesmo horário.
// Sem lógica de mesas/capacidade real — só para não sobrelotar um
// único slot enquanto não existir gestão de capacidade pelo admin.
export const LIMITE_RESERVAS_POR_HORARIO = 10;

export const MIN_PESSOAS = 1;
export const MAX_PESSOAS = 12;

export const DIAS_ANTECEDENCIA = 14;

function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function paraHHMM(minutos: number): string {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Todos os horários disponíveis num dia, a partir das faixas configuradas.
export function gerarHorarios(): string[] {
  const horarios: string[] = [];
  for (const faixa of FAIXAS_HORARIAS) {
    const inicio = paraMinutos(faixa.inicio);
    const fim = paraMinutos(faixa.fim);
    for (let m = inicio; m < fim; m += INTERVALO_MINUTOS) {
      horarios.push(paraHHMM(m));
    }
  }
  return horarios;
}
