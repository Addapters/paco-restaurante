"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { MesaInfo } from "./MesaSession";

export type OrderEstado = "pendente" | "em_preparacao" | "servido" | "pago";
export type AlertTipo = "chamar_staff" | "pedir_conta";

export interface CartLine {
  itemId: string;
  nome_pt: string;
  nome_en: string;
  preco: number;
  quantidade: number;
}

export interface OrderRow {
  id: string;
  estado: OrderEstado;
  criado_em: string;
  order_items: {
    id: string;
    quantidade: number;
    preco_unitario: number;
    e_oferta: boolean;
    menu_items: { nome_pt: string; nome_en: string } | null;
  }[];
}

interface MesaOrdersContextValue {
  mesa: MesaInfo;
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart(item: Omit<CartLine, "quantidade">): void;
  setQuantity(itemId: string, quantidade: number): void;
  submitting: boolean;
  submitOrder(): Promise<boolean>;
  orders: OrderRow[];
  sendAlert(tipo: AlertTipo): Promise<boolean>;
}

const MesaOrdersContext = createContext<MesaOrdersContextValue | null>(null);

// Contexto do fluxo de pedido na mesa. A sessão do cliente é anónima
// (Supabase anonymous sign-in), criada de forma preguiçosa no primeiro
// pedido/alerta — quem só lê o menu não cria utilizadores.
export function MesaOrdersProvider({
  mesa,
  children,
}: {
  mesa: MesaInfo;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const ensureUid = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return session.user.id;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) return null;
    return data.session.user.id;
  }, [supabase]);

  const loadOrders = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, estado, criado_em, order_items(id, quantidade, preco_unitario, e_oferta, menu_items(nome_pt, nome_en))"
        )
        .eq("mesa_id", mesa.id)
        .eq("cliente_id", userId)
        .order("criado_em", { ascending: false });
      setOrders((data as unknown as OrderRow[]) ?? []);
    },
    [supabase, mesa.id]
  );

  // Retomar sessão anónima existente (ex.: cliente volta a abrir o QR)
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session) setUid(session.user.id);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Histórico + Realtime: estado dos pedidos atualiza quando o staff muda
  useEffect(() => {
    if (!uid) return;
    loadOrders(uid);

    const channel = supabase
      .channel(`orders-mesa-${mesa.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `cliente_id=eq.${uid}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; estado: OrderEstado };
          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id ? { ...o, estado: updated.estado } : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, supabase, mesa.id, loadOrders]);

  const addToCart = useCallback((item: Omit<CartLine, "quantidade">) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.itemId);
      if (existing) {
        return prev.map((l) =>
          l.itemId === item.itemId ? { ...l, quantidade: l.quantidade + 1 } : l
        );
      }
      return [...prev, { ...item, quantidade: 1 }];
    });
  }, []);

  const setQuantity = useCallback((itemId: string, quantidade: number) => {
    setCart((prev) =>
      quantidade <= 0
        ? prev.filter((l) => l.itemId !== itemId)
        : prev.map((l) => (l.itemId === itemId ? { ...l, quantidade } : l))
    );
  }, []);

  const submitOrder = useCallback(async (): Promise<boolean> => {
    if (cart.length === 0 || submitting) return false;
    setSubmitting(true);
    try {
      const userId = await ensureUid();
      if (!userId) return false;

      const { error } = await supabase.rpc("place_order", {
        p_mesa_id: mesa.id,
        p_items: cart.map((l) => ({
          menu_item_id: l.itemId,
          quantidade: l.quantidade,
        })),
      });
      if (error) return false;

      setCart([]);
      setUid(userId); // ativa histórico + realtime na primeira encomenda
      await loadOrders(userId);
      return true;
    } finally {
      setSubmitting(false);
    }
  }, [cart, submitting, ensureUid, supabase, mesa.id, loadOrders]);

  const sendAlert = useCallback(
    async (tipo: AlertTipo): Promise<boolean> => {
      const userId = await ensureUid();
      if (!userId) return false;
      const { error } = await supabase
        .from("table_alerts")
        .insert({ mesa_id: mesa.id, tipo });
      return !error;
    },
    [ensureUid, supabase, mesa.id]
  );

  const cartCount = cart.reduce((sum, l) => sum + l.quantidade, 0);
  const cartTotal = cart.reduce((sum, l) => sum + l.preco * l.quantidade, 0);

  return (
    <MesaOrdersContext.Provider
      value={{
        mesa,
        cart,
        cartCount,
        cartTotal,
        addToCart,
        setQuantity,
        submitting,
        submitOrder,
        orders,
        sendAlert,
      }}
    >
      {children}
    </MesaOrdersContext.Provider>
  );
}

export function useMesaOrders() {
  const ctx = useContext(MesaOrdersContext);
  if (!ctx) {
    throw new Error("useMesaOrders só pode ser usado dentro de MesaOrdersProvider");
  }
  return ctx;
}

// Variante tolerante: devolve null fora do provider (ex.: menu público)
export function useMesaOrdersOptional() {
  return useContext(MesaOrdersContext);
}
