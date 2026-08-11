import { createClient } from "@/lib/supabase/server";

export interface MenuItem {
  id: string;
  nome_pt: string;
  nome_en: string;
  descricao_pt: string;
  descricao_en: string;
  preco: number;
  foto_url: string | null;
  disponivel: boolean;
  destaque: boolean;
}

export interface MenuCategory {
  id: string;
  nome_pt: string;
  nome_en: string;
  ordem: number;
  menu_items: MenuItem[];
}

// Menu público: categorias ordenadas, apenas itens disponíveis,
// com os destaques primeiro dentro de cada categoria.
export async function getMenu(): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .select(
      "id, nome_pt, nome_en, ordem, menu_items(id, nome_pt, nome_en, descricao_pt, descricao_en, preco, foto_url, disponivel, destaque)"
    )
    .order("ordem");

  if (error) {
    throw new Error(`Erro ao carregar o menu: ${error.message}`);
  }

  return (data ?? [])
    .map((cat) => ({
      ...cat,
      menu_items: cat.menu_items
        .filter((item) => item.disponivel)
        .sort((a, b) => Number(b.destaque) - Number(a.destaque)),
    }))
    .filter((cat) => cat.menu_items.length > 0);
}
