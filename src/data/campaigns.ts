// Campanhas e dias especiais mostrados na página da mesa.
// Conteúdo editável — por agora dados fictícios; no futuro pode migrar
// para uma tabela no Supabase gerida pela área de admin.
export interface Campaign {
  id: string;
  emoji: string;
  titulo_pt: string;
  titulo_en: string;
  descricao_pt: string;
  descricao_en: string;
}

export const campaigns: Campaign[] = [
  {
    id: "terca-bacalhau",
    emoji: "🐟",
    titulo_pt: "Terças do Bacalhau",
    titulo_en: "Codfish Tuesdays",
    descricao_pt:
      "Todas as terças, o nosso Bacalhau à Braga com 20% de desconto ao jantar.",
    descricao_en:
      "Every Tuesday, our Braga-style codfish at 20% off during dinner.",
  },
  {
    id: "menu-almoco",
    emoji: "🍽️",
    titulo_pt: "Menu de Almoço — 12€",
    titulo_en: "Lunch Menu — €12",
    descricao_pt:
      "Dias úteis das 12h às 15h: prato do dia, bebida, café e sobremesa.",
    descricao_en:
      "Weekdays from 12pm to 3pm: dish of the day, drink, coffee and dessert.",
  },
  {
    id: "aniversario",
    emoji: "🎂",
    titulo_pt: "Aniversariantes",
    titulo_en: "Birthday Treat",
    descricao_pt:
      "Faz anos? A sobremesa é por nossa conta — basta avisar a equipa.",
    descricao_en:
      "Is it your birthday? Dessert is on us — just let our team know.",
  },
];
