import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { formatPrice } from "@/lib/format";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Detalhe da fatura (link interno usado pelo provedor mock).
// O RLS decide o acesso: staff/admin veem faturas; um provedor real
// substituirá isto por um PDF oficial alojado no próprio provedor.
export default async function FaturaPage({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}) {
  const { locale, id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, numero_fatura, provedor_referencia, total, estado, criado_em, orders(id, criado_em, restaurant_tables(numero), order_items(id, quantidade, preco_unitario, e_oferta, motivo_oferta, menu_items(nome_pt, nome_en)))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const t = await getTranslations("Fatura");
  const order = invoice.orders as unknown as {
    criado_em: string;
    restaurant_tables: { numero: number } | null;
    order_items: {
      id: string;
      quantidade: number;
      preco_unitario: number;
      e_oferta: boolean;
      motivo_oferta: string | null;
      menu_items: { nome_pt: string; nome_en: string } | null;
    }[];
  } | null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Card className="p-8">
        <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Paco Restaurante</h1>
            <p className="text-sm text-smoke">
              {t("numero")}: {invoice.numero_fatura}
            </p>
            {order?.restaurant_tables && (
              <p className="text-sm text-smoke">
                {t("mesa", { numero: order.restaurant_tables.numero })}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-smoke">
            <p>
              {new Date(invoice.criado_em).toLocaleString(
                locale === "pt" ? "pt-PT" : "en-GB"
              )}
            </p>
            <p>{invoice.estado}</p>
          </div>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-smoke">
              <th className="py-2 font-medium">{t("item")}</th>
              <th className="py-2 text-center font-medium">{t("qtd")}</th>
              <th className="py-2 text-right font-medium">{t("preco")}</th>
              <th className="py-2 text-right font-medium">{t("subtotal")}</th>
            </tr>
          </thead>
          <tbody>
            {(order?.order_items ?? []).map((item) => {
              const nome = item.menu_items
                ? locale === "pt"
                  ? item.menu_items.nome_pt
                  : item.menu_items.nome_en
                : "—";
              return (
                <tr key={item.id} className="border-t border-ink/5 text-ink">
                  <td className="py-2">
                    {nome}
                    {item.e_oferta && (
                      <span className="ml-2 rounded-full bg-sage/15 px-2 py-0.5 text-xs font-medium text-sage-dark">
                        {t("oferta")}
                        {item.motivo_oferta ? ` — ${item.motivo_oferta}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-center">{item.quantidade}</td>
                  <td className="py-2 text-right">
                    {item.e_oferta ? (
                      <span>
                        <s className="text-smoke">
                          {formatPrice(item.preco_unitario, locale)}
                        </s>{" "}
                        {formatPrice(0, locale)}
                      </span>
                    ) : (
                      formatPrice(item.preco_unitario, locale)
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {formatPrice(
                      item.e_oferta ? 0 : item.preco_unitario * item.quantidade,
                      locale
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/20 font-bold text-ink">
              <td className="py-3" colSpan={3}>
                {t("total")}
              </td>
              <td className="py-3 text-right">
                {formatPrice(invoice.total, locale)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 rounded-lg bg-terracotta/10 p-3 text-xs text-terracotta-dark">
          {t("avisoDemo", { ref: invoice.provedor_referencia ?? "—" })}
        </p>
      </Card>
    </main>
  );
}
