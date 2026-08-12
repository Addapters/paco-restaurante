import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui";
import { EstadoBadge, type OrderEstado } from "@/components/EstadoBadge";
import { ProfileForm } from "@/components/cliente/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import { formatPrice } from "@/lib/format";

interface HistoricoOrder {
  id: string;
  estado: OrderEstado;
  criado_em: string;
  restaurant_tables: { numero: number } | null;
  order_items: {
    id: string;
    quantidade: number;
    preco_unitario: number;
    e_oferta: boolean;
    menu_items: { nome_pt: string; nome_en: string } | null;
  }[];
}

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sessões anónimas (QR da mesa) não têm perfil "de cliente habitual"
  if (!user || user.is_anonymous) {
    redirect({ href: "/cliente/login", locale });
  }

  const [t, { data: profile }, { data: orders }] = await Promise.all([
    getTranslations("Perfil"),
    supabase
      .from("profiles")
      .select(
        "id, nome, email, telefone, is_loyal, newsletter_subscrito, mesa_habitual_id, restaurant_tables!profiles_mesa_habitual_id_fkey(numero)"
      )
      .eq("id", user!.id)
      .single(),
    supabase
      .from("orders")
      .select(
        "id, estado, criado_em, restaurant_tables(numero), order_items(id, quantidade, preco_unitario, e_oferta, menu_items(nome_pt, nome_en))"
      )
      .eq("cliente_id", user!.id)
      .order("criado_em", { ascending: false })
      .limit(30),
  ]);

  if (!profile) {
    redirect({ href: "/cliente/login", locale });
  }

  const mesaHabitual = (
    profile!.restaurant_tables as unknown as { numero: number } | null
  )?.numero;
  const historico = (orders ?? []) as unknown as HistoricoOrder[];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {t("ola", { nome: profile!.nome || profile!.email })}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile!.is_loyal && (
              <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-white">
                ★ {t("clienteFiel")}
              </span>
            )}
            {mesaHabitual != null && (
              <span className="rounded-full bg-sage px-3 py-1 text-xs font-semibold text-white">
                {t("mesaHabitual", { numero: mesaHabitual })}
              </span>
            )}
          </div>
        </div>
        <SignOutButton redirectTo="/cliente" />
      </div>

      <Card>
        <CardTitle>{t("osTeusDados")}</CardTitle>
        <div className="mt-4">
          <ProfileForm
            profile={{
              id: profile!.id,
              nome: profile!.nome,
              telefone: profile!.telefone,
              newsletter_subscrito: profile!.newsletter_subscrito,
            }}
          />
        </div>
      </Card>

      <section>
        <h2 className="mb-4 text-xl font-bold text-ink">{t("historico")}</h2>
        {historico.length === 0 ? (
          <p className="text-smoke">{t("semHistorico")}</p>
        ) : (
          <div className="space-y-4">
            {historico.map((order) => {
              const total = order.order_items.reduce(
                (sum, i) =>
                  sum + (i.e_oferta ? 0 : i.preco_unitario * i.quantidade),
                0
              );
              return (
                <Card key={order.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-medium text-ink">
                        {new Date(order.criado_em).toLocaleDateString(
                          locale === "pt" ? "pt-PT" : "en-GB",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </span>
                      {order.restaurant_tables && (
                        <span className="text-sm text-smoke">
                          {t("mesa", { numero: order.restaurant_tables.numero })}
                        </span>
                      )}
                    </div>
                    <EstadoBadge estado={order.estado} />
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-ink">
                    {order.order_items.map((item) => (
                      <li key={item.id}>
                        {item.quantidade}×{" "}
                        {item.menu_items
                          ? locale === "pt"
                            ? item.menu_items.nome_pt
                            : item.menu_items.nome_en
                          : "—"}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-ink/10 pt-2 text-right text-sm font-bold text-ink">
                    {formatPrice(total, locale)}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
