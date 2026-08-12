"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/components/mesa/CampaignsSection";

interface Draft {
  titulo_pt: string;
  titulo_en: string;
  descricao_pt: string;
  descricao_en: string;
  emoji: string;
  imagem_url: string;
  valido_de: string;
  valido_ate: string;
}

const DRAFT_VAZIO: Draft = {
  titulo_pt: "",
  titulo_en: "",
  descricao_pt: "",
  descricao_en: "",
  emoji: "",
  imagem_url: "",
  valido_de: "",
  valido_ate: "",
};

// Gestão das campanhas/dias especiais mostrados na página do QR.
export function CampaignsManager() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("AdminArea.campanhas");

  const [campanhas, setCampanhas] = useState<Campaign[]>([]);
  // "nova" ou o id da campanha em edição
  const [form, setForm] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(DRAFT_VAZIO);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from("campaigns").select("*").order("ordem");
    setCampanhas((data as Campaign[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    // Fetch-on-mount legítimo: o setState acontece após o await
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  async function executar(promessa: PromiseLike<{ error: unknown }>) {
    setErro(false);
    const { error } = await promessa;
    if (error) setErro(true);
    await carregar();
  }

  function abrirForm(chave: string, campanha?: Campaign) {
    setForm(chave);
    setDraft(
      campanha
        ? {
            titulo_pt: campanha.titulo_pt,
            titulo_en: campanha.titulo_en,
            descricao_pt: campanha.descricao_pt,
            descricao_en: campanha.descricao_en,
            emoji: campanha.emoji ?? "",
            imagem_url: campanha.imagem_url ?? "",
            valido_de: campanha.valido_de ?? "",
            valido_ate: campanha.valido_ate ?? "",
          }
        : DRAFT_VAZIO
    );
  }

  async function gravar(e: React.FormEvent, id?: string) {
    e.preventDefault();
    const payload = {
      titulo_pt: draft.titulo_pt,
      titulo_en: draft.titulo_en,
      descricao_pt: draft.descricao_pt,
      descricao_en: draft.descricao_en,
      emoji: draft.emoji || null,
      imagem_url: draft.imagem_url || null,
      valido_de: draft.valido_de || null,
      valido_ate: draft.valido_ate || null,
    };
    await executar(
      id
        ? supabase.from("campaigns").update(payload).eq("id", id)
        : supabase.from("campaigns").insert({
            ...payload,
            ordem: Math.max(0, ...campanhas.map((c) => c.ordem)) + 1,
          })
    );
    setForm(null);
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-ink/20 bg-paper px-2 text-sm text-ink placeholder:text-smoke focus:border-terracotta focus:outline-none";

  // Função de render (não componente): mantém a identidade da árvore e o
  // foco dos inputs entre re-renders do estado draft
  function renderFormulario(id?: string) {
    return (
      <form
        onSubmit={(e) => gravar(e, id)}
        className="mt-3 grid gap-2 rounded-xl border border-terracotta/40 bg-cream p-3 sm:grid-cols-2"
      >
        <input required placeholder={t("campos.tituloPt")} className={inputClass}
          value={draft.titulo_pt}
          onChange={(e) => setDraft((d) => ({ ...d, titulo_pt: e.target.value }))} />
        <input required placeholder={t("campos.tituloEn")} className={inputClass}
          value={draft.titulo_en}
          onChange={(e) => setDraft((d) => ({ ...d, titulo_en: e.target.value }))} />
        <input placeholder={t("campos.descricaoPt")} className={inputClass}
          value={draft.descricao_pt}
          onChange={(e) => setDraft((d) => ({ ...d, descricao_pt: e.target.value }))} />
        <input placeholder={t("campos.descricaoEn")} className={inputClass}
          value={draft.descricao_en}
          onChange={(e) => setDraft((d) => ({ ...d, descricao_en: e.target.value }))} />
        <input placeholder={t("campos.emoji")} className={inputClass}
          value={draft.emoji}
          onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))} />
        <input placeholder={t("campos.imagem")} className={inputClass}
          value={draft.imagem_url}
          onChange={(e) => setDraft((d) => ({ ...d, imagem_url: e.target.value }))} />
        <label className="text-sm text-smoke">
          {t("campos.validoDe")}
          <input type="date" className={inputClass} value={draft.valido_de}
            onChange={(e) => setDraft((d) => ({ ...d, valido_de: e.target.value }))} />
        </label>
        <label className="text-sm text-smoke">
          {t("campos.validoAte")}
          <input type="date" className={inputClass} value={draft.valido_ate}
            onChange={(e) => setDraft((d) => ({ ...d, valido_ate: e.target.value }))} />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" size="sm">{t("guardar")}</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setForm(null)}>
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

      <div className="flex justify-end">
        <Button onClick={() => abrirForm("nova")}>+ {t("nova")}</Button>
      </div>
      {form === "nova" && (
        <Card>
          <CardTitle>{t("nova")}</CardTitle>
          {renderFormulario()}
        </Card>
      )}

      {campanhas.map((c) => (
        <Card key={c.id} className={cn(!c.ativo && "opacity-60")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>
              {c.emoji && <span className="mr-2">{c.emoji}</span>}
              {c.titulo_pt}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={c.ativo ? "secondary" : "outline"}
                onClick={() =>
                  executar(
                    supabase
                      .from("campaigns")
                      .update({ ativo: !c.ativo })
                      .eq("id", c.id)
                  )
                }
              >
                {c.ativo ? t("ativa") : t("inativa")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => abrirForm(c.id, c)}>
                ✎
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (confirm(t("confirmarApagar"))) {
                    executar(supabase.from("campaigns").delete().eq("id", c.id));
                  }
                }}
              >
                🗑
              </Button>
            </div>
          </div>
          <p className="mt-1 text-sm text-smoke">{c.descricao_pt}</p>
          {(c.valido_de || c.valido_ate) && (
            <p className="mt-1 text-xs text-smoke">
              {t("validade", {
                de: c.valido_de ?? "…",
                ate: c.valido_ate ?? "…",
              })}
            </p>
          )}
          {form === c.id && renderFormulario(c.id)}
        </Card>
      ))}
    </div>
  );
}
