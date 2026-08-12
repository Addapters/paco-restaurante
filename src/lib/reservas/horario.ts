// Configuração do horário de reservas. Fase atual: constantes no
// código; uma gestão de capacidade por horário configurável pelo
// admin fica para uma fase futura.
//
// Horário de funcionamento:
//   Domingo a Quinta: 12h–23h
//   Sexta e Sábado:   12h–01h (do dia seguinte)

const ABERTURA_MINUTOS = 12 * 60; // 12:00

// Fecho em minutos desde a meia-noite do dia escolhido; > 1440 quando
// o fecho é já no dia seguinte (sexta/sábado, até à 01h).
function fechoMinutos(diaSemana: number): number {
  const sextaOuSabado = diaSemana === 5 || diaSemana === 6;
  return sextaOuSabado ? 24 * 60 + 60 : 23 * 60;
}

export const INTERVALO_MINUTOS = 30;

// Aproximação simples: nº máximo de reservas aceites no mesmo horário.
// Sem lógica de mesas/capacidade real — só para não sobrelotar um
// único slot enquanto não existir gestão de capacidade pelo admin.
export const LIMITE_RESERVAS_POR_HORARIO = 10;

export const MIN_PESSOAS = 1;
export const MAX_PESSOAS = 12;

export const DIAS_ANTECEDENCIA = 14;

export interface HorarioOption {
  hora: string; // "HH:MM"
  diaSeguinte: boolean; // true = já é a madrugada do dia seguinte
}

function paraHHMM(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

// Horários disponíveis para uma data (formato "YYYY-MM-DD"), já
// considerando o fecho depois da meia-noite ao fim de semana.
export function gerarHorarios(dataIso: string): HorarioOption[] {
  const diaSemana = new Date(`${dataIso}T00:00:00`).getDay();
  const fim = fechoMinutos(diaSemana);
  const horarios: HorarioOption[] = [];
  for (let m = ABERTURA_MINUTOS; m < fim; m += INTERVALO_MINUTOS) {
    horarios.push({ hora: paraHHMM(m), diaSeguinte: m >= 24 * 60 });
  }
  return horarios;
}
