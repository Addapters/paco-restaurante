"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardTitle, Input } from "@/components/ui";

interface Mesa {
  id: string;
  numero: number;
  qr_token: string;
  mesa_apadrinhada_cliente_id: string | null;
}

interface ClienteOption {
  id: string;
  nome: string;
  email: string;
}

// Gestão de mesas: criação, QR codes (gerados no browser, prontos a
// imprimir) e associação de mesa apadrinhada a clientes fiéis.
export function TablesManager() {
  const supabase = useMemo(() => createClient(), []);
  const t = useTranslations("AdminArea.mesas");

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [novoNumero, setNovoNumero] = useState("");
  const [padrinhoDe, setPadrinhoDe] = useState<string | null>(null);
  const [clienteEscolhido, setClienteEscolhido] = useState("");
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase
        .from("restaurant_tables")
        .select("id, numero, qr_token, mesa_apadrinhada_cliente_id")
        .order("numero"),
      supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("role", "cliente")
        .order("nome"),
    ]);
    setMesas((m as Mesa[]) ?? []);
    setClientes((c as ClienteOption[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const nomeDoCliente = useMemo(
    () =>
      new Map(clientes.map((c) => [c.id, c.nome || c.email] as const)),
    [clientes]
  );

  async function executar(promessa: PromiseLike<{ error: unknown }>) {
    setErro(false);
    const { error } = await promessa;
    if (error) setErro(true);
    await carregar();
  }

  async function criarMesa(e: React.FormEvent) {
    e.preventDefault();
    await executar(
      supabase.from("restaurant_tables").insert({ numero: Number(novoNumero) })
    );
    setNovoNumero("");
  }

  async function descarregarQr(mesa: Mesa) {
    const url = `${window.location.origin}/mesa/${mesa.qr_token}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 1024,
      margin: 2,
      color: { dark: "#353d4d", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `mesa-${mesa.numero}-qr.png`;
    a.click();
  }

  async function regenerarToken(mesa: Mesa) {
    if (!confirm(t("confirmarRegenerar"))) return;
    await executar(
      supabase
        .from("restaurant_tables")
        .update({ qr_token: crypto.randomUUID() })
        .eq("id", mesa.id)
    );
  }

  // Espelha a lógica do script admin: padrinho + mesa habitual + fiel
  async function associarPadrinho(mesa: Mesa) {
    if (!clienteEscolhido) return;
    setErro(false);
    const { error: e1 } = await supabase
      .from("restaurant_tables")
      .update({ mesa_apadrinhada_cliente_id: clienteEscolhido })
      .eq("id", mesa.id);
    const { error: e2 } = await supabase
      .from("profiles")
      .update({ mesa_habitual_id: mesa.id, is_loyal: true })
      .eq("id", clienteEscolhido);
    if (e1 || e2) setErro(true);
    setPadrinhoDe(null);
    setClienteEscolhido("");
    await carregar();
  }

  async function desassociarPadrinho(mesa: Mesa) {
    setErro(false);
    const clienteId = mesa.mesa_apadrinhada_cliente_id;
    const { error: e1 } = await supabase
      .from("restaurant_tables")
      .update({ mesa_apadrinhada_cliente_id: null })
      .eq("id", mesa.id);
    const { error: e2 } = clienteId
      ? await supabase
          .from("profiles")
          .update({ mesa_habitual_id: null })
          .eq("id", clienteId)
      : { error: null };
    if (e1 || e2) setErro(true);
    await carregar();
  }

  return (
    <div className="space-y-6">
      {erro && (
        <p className="rounded-lg bg-terracotta/10 p-3 text-sm font-medium text-terracotta-dark">
          {t("erro")}
        </p>
      )}

      <Card>
        <CardTitle>{t("novaMesa")}</CardTitle>
        <form onSubmit={criarMesa} className="mt-3 flex items-end gap-3">
          <div className="w-40">
            <Input
              id="numero"
              type="number"
              min="1"
              label={t("numero")}
              value={novoNumero}
              onChange={(e) => setNovoNumero(e.target.value)}
              required
            />
          </div>
          <Button type="submit">{t("criar")}</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {mesas.map((mesa) => (
          <Card key={mesa.id}>
            <div className="flex items-center justify-between">
              <CardTitle>{t("mesa", { numero: mesa.numero })}</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => descarregarQr(mesa)}>
                  ⬇ {t("descarregarQr")}
                </Button>
                <Button size="sm" variant="ghost" title={t("regenerarQr")}
                  onClick={() => regenerarToken(mesa)}>
                  ↻
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(t("confirmarApagar"))) {
                      executar(
                        supabase.from("restaurant_tables").delete().eq("id", mesa.id)
                      );
                    }
                  }}
                >
                  🗑
                </Button>
              </div>
            </div>

            <p className="mt-2 break-all text-xs text-smoke">
              /mesa/{mesa.qr_token}
            </p>

            <div className="mt-3 border-t border-ink/10 pt-3 text-sm">
              {mesa.mesa_apadrinhada_cliente_id ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink">
                    ★ {t("apadrinhadaPor")}{" "}
                    <span className="font-semibold">
                      {nomeDoCliente.get(mesa.mesa_apadrinhada_cliente_id) ?? "—"}
                    </span>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => desassociarPadrinho(mesa)}>
                    {t("desassociar")}
                  </Button>
                </div>
              ) : padrinhoDe === mesa.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={clienteEscolhido}
                    onChange={(e) => setClienteEscolhido(e.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-ink/20 bg-paper px-2 text-sm text-ink focus:border-terracotta focus:outline-none"
                  >
                    <option value="">{t("escolherCliente")}</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome || c.email}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={() => associarPadrinho(mesa)}
                    disabled={!clienteEscolhido}>
                    ✓
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPadrinhoDe(null)}>
                    ✕
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setPadrinhoDe(mesa.id)}>
                  + {t("associarPadrinho")}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
