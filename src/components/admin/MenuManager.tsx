"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  categoria_id: string;
  nome_pt: string;
  nome_en: string;
  descricao_pt: string;
  descricao_en: string;
  preco: number;
  foto_url: string | null;
  disponivel: boolean;
  destaque: boolean;
}

interface Categoria {
  id: string;
  nome_pt: string;
  nome_en: string;
  ordem: number;
  menu_items: Item[];
}

interface ItemDraft {
  nome_pt: string;
  nome_en: string;
  descricao_pt: string;
  descricao_en: string;
  preco: string;
  foto_url: string;
}

const DRAFT_VAZIO: ItemDraft = {
  nome_pt: "",
  nome_en: "",
  descricao_pt: "",
  descricao_en: "",
  preco: "",
  foto_url: "",
};

// Gestão do menu pelo admin — substitui alterações em código.
export function MenuManager() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("AdminArea.menu");
  const locale = useLocale() as Locale;

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novaCategoria, setNovaCategoria] = useState({ nome_pt: "", nome_en: "" });
  // Formulário de item: "nova:<categoriaId>" ou id do item em edição
  const [itemForm, setItemForm] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(DRAFT_VAZIO);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("menu_categories")
      .select(
        "id, nome_pt, nome_en, ordem, menu_items(id, categoria_id, nome_pt, nome_en, descricao_pt, descricao_en, preco, foto_url, disponivel, destaque)"
      )
      .order("ordem");
    setCategorias(
      ((data as unknown as Categoria[]) ?? []).map((c) => ({
        ...c,
        menu_items: c.menu_items.sort((a, b) =>
          a.nome_pt.localeCompare(b.nome_pt)
        ),
      }))
    );
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(promessa: PromiseLike<{ error: unknown }>) {
    setErro(false);
    const { error } = await promessa;
    if (error) setErro(true);
    await carregar();
  }

  async function criarCategoria(e: React.FormEvent) {
    e.preventDefault();
    const ordem = Math.max(0, ...categorias.map((c) => c.ordem)) + 1;
    await executar(
      supabase.from("menu_categories").insert({ ...novaCategoria, ordem })
    );
    setNovaCategoria({ nome_pt: "", nome_en: "" });
  }

  function abrirFormItem(chave: string, item?: Item) {
    setItemForm(chave);
    setDraft(
      item
        ? {
            nome_pt: item.nome_pt,
            nome_en: item.nome_en,
            descricao_pt: item.descricao_pt,
            descricao_en: item.descricao_en,
            preco: String(item.preco),
            foto_url: item.foto_url ?? "",
          }
        : DRAFT_VAZIO
    );
  }

  async function gravarItem(e: React.FormEvent, categoriaId: string, itemId?: string) {
    e.preventDefault();
    const payload = {
      nome_pt: draft.nome_pt,
      nome_en: draft.nome_en,
      descricao_pt: draft.descricao_pt,
      descricao_en: draft.descricao_en,
      preco: Number(draft.preco) || 0,
      foto_url: draft.foto_url || null,
    };
    await executar(
      itemId
        ? supabase.from("menu_items").update(payload).eq("id", itemId)
        : supabase
            .from("menu_items")
            .insert({ ...payload, categoria_id: categoriaId })
    );
    setItemForm(null);
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-ink/20 bg-paper px-2 text-sm text-ink placeholder:text-smoke focus:border-terracotta focus:outline-none";

  function FormItem({ categoriaId, itemId }: { categoriaId: string; itemId?: string }) {
    return (
      <form
        onSubmit={(e) => gravarItem(e, categoriaId, itemId)}
        className="mt-3 grid gap-2 rounded-xl border border-terracotta/40 bg-cream p-3 sm:grid-cols-2"
      >
        <input required placeholder={t("campos.nomePt")} className={inputClass}
          value={draft.nome_pt}
          onChange={(e) => setDraft((d) => ({ ...d, nome_pt: e.target.value }))} />
        <input required placeholder={t("campos.nomeEn")} className={inputClass}
          value={draft.nome_en}
          onChange={(e) => setDraft((d) => ({ ...d, nome_en: e.target.value }))} />
        <input placeholder={t("campos.descricaoPt")} className={inputClass}
          value={draft.descricao_pt}
          onChange={(e) => setDraft((d) => ({ ...d, descricao_pt: e.target.value }))} />
        <input placeholder={t("campos.descricaoEn")} className={inputClass}
          value={draft.descricao_en}
          onChange={(e) => setDraft((d) => ({ ...d, descricao_en: e.target.value }))} />
        <input required type="number" step="0.01" min="0"
          placeholder={t("campos.preco")} className={inputClass}
          value={draft.preco}
          onChange={(e) => setDraft((d) => ({ ...d, preco: e.target.value }))} />
        <input placeholder={t("campos.foto")} className={inputClass}
          value={draft.foto_url}
          onChange={(e) => setDraft((d) => ({ ...d, foto_url: e.target.value }))} />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm">
            {t("guardar")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setItemForm(null)}>
            {t("cancelar")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {erro && (
        <p className="rounded-lg bg-terracotta/10 p-3 text-sm font-medium text-terracotta-dark">
          {t("erro")}
        </p>
      )}

      {categorias.map((cat) => (
        <Card key={cat.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              {locale === "pt" ? cat.nome_pt : cat.nome_en}
              <span className="ml-2 text-sm font-normal text-smoke">
                ({cat.menu_items.length})
              </span>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => abrirFormItem(`nova:${cat.id}`)}>
                + {t("novoItem")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm(t("confirmarApagarCategoria"))) {
                    executar(
                      supabase.from("menu_categories").delete().eq("id", cat.id)
                    );
                  }
                }}
              >
                🗑
              </Button>
            </div>
          </div>

          {itemForm === `nova:${cat.id}` && <FormItem categoriaId={cat.id} />}

          <ul className="mt-4 divide-y divide-ink/5">
            {cat.menu_items.map((item) => (
              <li key={item.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 text-sm font-medium",
                      item.disponivel ? "text-ink" : "text-smoke line-through"
                    )}
                  >
                    {locale === "pt" ? item.nome_pt : item.nome_en}
                    {item.destaque && (
                      <span className="ml-2 rounded-full bg-terracotta px-2 py-0.5 text-xs text-white">
                        {t("destaque")}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatPrice(item.preco, locale)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={item.disponivel ? "secondary" : "outline"}
                      title={t("disponivel")}
                      onClick={() =>
                        executar(
                          supabase
                            .from("menu_items")
                            .update({ disponivel: !item.disponivel })
                            .eq("id", item.id)
                        )
                      }
                    >
                      {item.disponivel ? t("ativo") : t("inativo")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title={t("destaque")}
                      onClick={() =>
                        executar(
                          supabase
                            .from("menu_items")
                            .update({ destaque: !item.destaque })
                            .eq("id", item.id)
                        )
                      }
                    >
                      {item.destaque ? "★" : "☆"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirFormItem(item.id, item)}
                    >
                      ✎
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t("confirmarApagarItem"))) {
                          executar(
                            supabase.from("menu_items").delete().eq("id", item.id)
                          );
                        }
                      }}
                    >
                      🗑
                    </Button>
                  </div>
                </div>
                {itemForm === item.id && (
                  <FormItem categoriaId={cat.id} itemId={item.id} />
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card>
        <CardTitle>{t("novaCategoria")}</CardTitle>
        <form onSubmit={criarCategoria} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Input
              id="cat-pt"
              label={t("campos.nomePt")}
              value={novaCategoria.nome_pt}
              onChange={(e) =>
                setNovaCategoria((c) => ({ ...c, nome_pt: e.target.value }))
              }
              required
            />
          </div>
          <div className="w-56">
            <Input
              id="cat-en"
              label={t("campos.nomeEn")}
              value={novaCategoria.nome_en}
              onChange={(e) =>
                setNovaCategoria((c) => ({ ...c, nome_en: e.target.value }))
              }
              required
            />
          </div>
          <Button type="submit">{t("criar")}</Button>
        </form>
      </Card>
    </div>
  );
}
