import type { MenuCategory, MenuItem } from "@/lib/menu";
import type { UpsellEngine, UpsellSugestao } from "./types";

const RE_BEBIDAS = /bebida|drink/i;

// Regras simples de upsell:
// 1. Carrinho só com comida → sugere uma bebida (destaques primeiro).
// 2. Sugere o item em destaque da categoria mais representada no
//    carrinho, se ainda lá não estiver.
export class RuleBasedUpsellEngine implements UpsellEngine {
  readonly nome = "regras";

  sugerir(carrinhoItemIds: string[], menu: MenuCategory[]): UpsellSugestao[] {
    if (carrinhoItemIds.length === 0) return [];

    const noCarrinho = new Set(carrinhoItemIds);
    const categoriaDe = new Map<string, MenuCategory>();
    for (const cat of menu) {
      for (const item of cat.menu_items) categoriaDe.set(item.id, cat);
    }

    const sugestoes: UpsellSugestao[] = [];
    const jaSugerido = new Set<string>();
    const adicionar = (item: MenuItem | undefined, motivo: UpsellSugestao["motivo"]) => {
      if (!item || noCarrinho.has(item.id) || jaSugerido.has(item.id)) return;
      jaSugerido.add(item.id);
      sugestoes.push({ item, motivo });
    };

    // Regra 1: falta bebida?
    const categoriaBebidas = menu.find((c) =>
      RE_BEBIDAS.test(`${c.nome_pt} ${c.nome_en}`)
    );
    const carrinhoTemBebida = carrinhoItemIds.some(
      (id) => categoriaDe.get(id) === categoriaBebidas
    );
    if (categoriaBebidas && !carrinhoTemBebida) {
      const candidatos = categoriaBebidas.menu_items.filter(
        (i) => !noCarrinho.has(i.id)
      );
      adicionar(
        candidatos.find((i) => i.destaque) ?? candidatos[0],
        "bebida_em_falta"
      );
    }

    // Regra 2: destaque da categoria mais representada no carrinho
    const contagem = new Map<MenuCategory, number>();
    for (const id of carrinhoItemIds) {
      const cat = categoriaDe.get(id);
      if (cat && cat !== categoriaBebidas) {
        contagem.set(cat, (contagem.get(cat) ?? 0) + 1);
      }
    }
    const categoriaTop = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (categoriaTop) {
      adicionar(
        categoriaTop.menu_items.find((i) => i.destaque && !noCarrinho.has(i.id)),
        "destaque_da_categoria"
      );
    }

    return sugestoes.slice(0, 2);
  }
}
