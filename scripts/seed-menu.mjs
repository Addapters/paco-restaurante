// Popula o menu com dados fictícios realistas e cria as mesas 1–10.
// Idempotente: não duplica se já existirem categorias/mesas.
// Uso: node scripts/seed-menu.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnvLocal();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const foto = (seed) => `https://picsum.photos/seed/${seed}/800/600`;

const CATEGORIES = [
  {
    nome_pt: "Entradas",
    nome_en: "Starters",
    ordem: 1,
    items: [
      {
        nome_pt: "Pão alentejano com azeite e azeitonas",
        nome_en: "Alentejo bread with olive oil and olives",
        descricao_pt: "Pão rústico servido morno, azeite virgem extra e azeitonas marinadas.",
        descricao_en: "Rustic bread served warm, extra virgin olive oil and marinated olives.",
        preco: 3.5,
        foto_url: foto("pao-azeitonas"),
      },
      {
        nome_pt: "Croquetes de alheira com maionese de mostarda",
        nome_en: "Alheira croquettes with mustard mayo",
        descricao_pt: "Croquetes crocantes de alheira de Mirandela, acompanhados de maionese caseira.",
        descricao_en: "Crispy Mirandela alheira croquettes with homemade mustard mayo.",
        preco: 6.5,
        foto_url: foto("croquetes-alheira"),
        destaque: true,
      },
      {
        nome_pt: "Queijo de Azeitão com doce de abóbora",
        nome_en: "Azeitão cheese with pumpkin jam",
        descricao_pt: "Queijo amanteigado DOP com doce de abóbora artesanal e tostas.",
        descricao_en: "Buttery PDO cheese with artisanal pumpkin jam and toast.",
        preco: 7.0,
        foto_url: foto("queijo-azeitao"),
      },
      {
        nome_pt: "Camarão ao alhinho",
        nome_en: "Garlic prawns",
        descricao_pt: "Camarão salteado em azeite, alho e malagueta, com pão para molhar.",
        descricao_en: "Prawns sautéed in olive oil, garlic and chilli, with bread for dipping.",
        preco: 9.5,
        foto_url: foto("camarao-alhinho"),
      },
    ],
  },
  {
    nome_pt: "Pratos Principais",
    nome_en: "Main Courses",
    ordem: 2,
    items: [
      {
        nome_pt: "Bacalhau à Braga com batata a murro",
        nome_en: "Braga-style codfish with punched potatoes",
        descricao_pt: "Lombo de bacalhau frito com cebolada, batata a murro e grelos salteados.",
        descricao_en: "Fried cod loin with onion confit, punched potatoes and sautéed greens.",
        preco: 16.5,
        foto_url: foto("bacalhau-braga"),
        destaque: true,
      },
      {
        nome_pt: "Arroz de pato tradicional",
        nome_en: "Traditional duck rice",
        descricao_pt: "Arroz de pato no forno com chouriço e crosta dourada.",
        descricao_en: "Oven-baked duck rice with chouriço and a golden crust.",
        preco: 14.0,
        foto_url: foto("arroz-pato"),
      },
      {
        nome_pt: "Secretos de porco preto com migas",
        nome_en: "Iberian black pork secretos with migas",
        descricao_pt: "Secretos de porco preto grelhados, migas alentejanas e molho de laranja.",
        descricao_en: "Grilled Iberian black pork, Alentejo-style migas and orange jus.",
        preco: 17.5,
        foto_url: foto("porco-preto"),
      },
      {
        nome_pt: "Polvo à lagareiro",
        nome_en: "Lagareiro-style octopus",
        descricao_pt: "Polvo assado no forno com azeite, alho e batata a murro.",
        descricao_en: "Oven-roasted octopus with olive oil, garlic and punched potatoes.",
        preco: 19.0,
        foto_url: foto("polvo-lagareiro"),
        destaque: true,
      },
      {
        nome_pt: "Risoto de cogumelos e espargos",
        nome_en: "Mushroom and asparagus risotto",
        descricao_pt: "Risoto cremoso de cogumelos portobello e espargos verdes (vegetariano).",
        descricao_en: "Creamy portobello mushroom and green asparagus risotto (vegetarian).",
        preco: 13.5,
        foto_url: foto("risoto-cogumelos"),
      },
      {
        nome_pt: "Prato do dia",
        nome_en: "Dish of the day",
        descricao_pt: "Pergunte à equipa pela sugestão do chef.",
        descricao_en: "Ask our team for the chef's suggestion.",
        preco: 11.0,
        foto_url: foto("prato-dia"),
        disponivel: false,
      },
    ],
  },
  {
    nome_pt: "Sobremesas",
    nome_en: "Desserts",
    ordem: 3,
    items: [
      {
        nome_pt: "Pastel de nata com canela",
        nome_en: "Custard tart with cinnamon",
        descricao_pt: "O clássico, servido morno com canela a gosto.",
        descricao_en: "The classic, served warm with cinnamon to taste.",
        preco: 2.5,
        foto_url: foto("pastel-nata"),
      },
      {
        nome_pt: "Baba de camelo",
        nome_en: "Caramel mousse",
        descricao_pt: "Mousse de leite condensado caramelizado com amêndoa torrada.",
        descricao_en: "Caramelised condensed milk mousse with toasted almond.",
        preco: 4.5,
        foto_url: foto("baba-camelo"),
      },
      {
        nome_pt: "Tarte de amêndoa com gelado",
        nome_en: "Almond tart with ice cream",
        descricao_pt: "Fatia de tarte de amêndoa caramelizada com gelado de baunilha.",
        descricao_en: "Slice of caramelised almond tart with vanilla ice cream.",
        preco: 5.5,
        foto_url: foto("tarte-amendoa"),
        destaque: true,
      },
    ],
  },
  {
    nome_pt: "Bebidas",
    nome_en: "Drinks",
    ordem: 4,
    items: [
      {
        nome_pt: "Vinho da casa (jarro 0,5L)",
        nome_en: "House wine (0.5L jug)",
        descricao_pt: "Tinto ou branco regional, selecionado pelo Paco.",
        descricao_en: "Regional red or white, selected by Paco.",
        preco: 6.0,
        foto_url: foto("vinho-casa"),
      },
      {
        nome_pt: "Imperial (20cl)",
        nome_en: "Draft beer (20cl)",
        descricao_pt: "Cerveja à pressão bem fresca.",
        descricao_en: "Ice-cold draft beer.",
        preco: 1.8,
        foto_url: foto("imperial"),
      },
      {
        nome_pt: "Limonada caseira com hortelã",
        nome_en: "Homemade lemonade with mint",
        descricao_pt: "Limões espremidos na hora, hortelã fresca e um toque de mel.",
        descricao_en: "Freshly squeezed lemons, fresh mint and a touch of honey.",
        preco: 3.0,
        foto_url: foto("limonada"),
      },
      {
        nome_pt: "Café expresso",
        nome_en: "Espresso",
        descricao_pt: "Lote próprio, torra média.",
        descricao_en: "House blend, medium roast.",
        preco: 1.0,
        foto_url: foto("cafe"),
      },
    ],
  },
];

// Categorias e itens
const { data: existing } = await admin.from("menu_categories").select("id");
if ((existing?.length ?? 0) > 0) {
  console.log("Menu já tem categorias — seed ignorado (apaga-as para re-seed).");
} else {
  for (const { items, ...cat } of CATEGORIES) {
    const { data: catRow, error } = await admin
      .from("menu_categories")
      .insert(cat)
      .select()
      .single();
    if (error) {
      console.error(`Erro na categoria ${cat.nome_pt}:`, error.message);
      process.exit(1);
    }
    const { error: itemsError } = await admin
      .from("menu_items")
      .insert(
        items.map((i) => ({
          destaque: false,
          disponivel: true,
          ...i,
          categoria_id: catRow.id,
        }))
      );
    if (itemsError) {
      console.error(`Erro nos itens de ${cat.nome_pt}:`, itemsError.message);
      process.exit(1);
    }
    console.log(`✓ ${cat.nome_pt} (${items.length} itens)`);
  }
}

// Mesas 1–10
const { data: mesas } = await admin.from("restaurant_tables").select("numero");
const existentes = new Set((mesas ?? []).map((m) => m.numero));
const novas = Array.from({ length: 10 }, (_, i) => i + 1).filter(
  (n) => !existentes.has(n)
);
if (novas.length > 0) {
  const { error } = await admin
    .from("restaurant_tables")
    .insert(novas.map((numero) => ({ numero })));
  if (error) {
    console.error("Erro a criar mesas:", error.message);
    process.exit(1);
  }
  console.log(`✓ Mesas criadas: ${novas.join(", ")}`);
} else {
  console.log("Mesas 1–10 já existem.");
}
console.log("Seed concluído.");
