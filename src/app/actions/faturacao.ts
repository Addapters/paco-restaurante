"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getInvoiceProvider, type MetodoPagamento } from "@/lib/invoicing";

export interface ResultadoPagamento {
  ok: boolean;
  erro?: "sem_sessao" | "pedido_nao_encontrado" | "ja_pago" | "pagamento" | "fatura";
  numeroFatura?: string;
  faturaUrl?: string | null;
}

interface OrderItemRow {
  quantidade: number;
  preco_unitario: number;
  e_oferta: boolean;
  menu_items: { nome_pt: string } | null;
}

// Regista o pagamento (método apenas informativo — o pagamento real
// acontece no TPA físico), marca o pedido como pago e emite a fatura
// através do InvoiceProvider configurado. O RLS garante que só o staff
// consegue completar este fluxo.
export async function registarPagamentoEEmitirFatura(
  orderId: string,
  metodo: MetodoPagamento
): Promise<ResultadoPagamento> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "sem_sessao" };

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, estado, order_items(quantidade, preco_unitario, e_oferta, menu_items(nome_pt))"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, erro: "pedido_nao_encontrado" };
  if (order.estado === "pago") return { ok: false, erro: "ja_pago" };

  const itens = order.order_items as unknown as OrderItemRow[];
  const linhas = itens.map((i) => ({
    descricao: i.menu_items?.nome_pt ?? "Item",
    quantidade: i.quantidade,
    precoUnitario: Number(i.preco_unitario),
    eOferta: i.e_oferta,
  }));
  // Ofertas faturam a 0,00 € (o valor original fica em order_items)
  const total = linhas.reduce(
    (s, l) => s + (l.eOferta ? 0 : l.precoUnitario * l.quantidade),
    0
  );

  const { error: payErr } = await supabase.from("payments").insert({
    order_id: orderId,
    metodo,
    valor: total,
    registado_por: user.id,
  });
  if (payErr) return { ok: false, erro: "pagamento" };

  const { error: updErr } = await supabase
    .from("orders")
    .update({ estado: "pago" })
    .eq("id", orderId);
  if (updErr) return { ok: false, erro: "pagamento" };

  // Emissão da fatura oficial via provedor (mock até haver decisão)
  try {
    const provider = getInvoiceProvider();
    const fatura = await provider.emitirFatura({
      orderId,
      metodo,
      linhas,
      total,
    });

    const invoiceId = randomUUID();
    const url = fatura.url ?? `/fatura/${invoiceId}`;
    const { error: invErr } = await supabase.from("invoices").insert({
      id: invoiceId,
      order_id: orderId,
      provedor_referencia: fatura.provedorReferencia,
      numero_fatura: fatura.numeroFatura,
      total,
      estado: "emitida",
      url,
    });
    if (invErr) return { ok: true, erro: "fatura" };

    return { ok: true, numeroFatura: fatura.numeroFatura, faturaUrl: url };
  } catch {
    // Pagamento ficou registado; a fatura pode ser emitida mais tarde
    return { ok: true, erro: "fatura" };
  }
}
