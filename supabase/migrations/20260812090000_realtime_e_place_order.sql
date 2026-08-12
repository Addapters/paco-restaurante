-- Módulo pedidos na mesa: Realtime + função transacional de pedido.
-- Aplicar no SQL Editor do Supabase.

-- ============================================================
-- REALTIME
-- Cliente recebe mudanças de estado dos seus pedidos; staff (módulo 6)
-- recebe novos alertas de mesa. O RLS aplica-se também ao Realtime:
-- cada subscritor só recebe linhas que as suas políticas deixam ler.
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.table_alerts;

-- ============================================================
-- PLACE_ORDER: cria o pedido e os itens numa única transação.
-- security invoker → o RLS normal aplica-se (o cliente só cria
-- pedidos próprios). O preço unitário vem SEMPRE de menu_items,
-- nunca do cliente — impossível adulterar preços.
-- ============================================================
create or replace function public.place_order(p_mesa_id uuid, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
  v_count integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'O pedido tem de ter pelo menos um item';
  end if;

  insert into public.orders (mesa_id, origem, cliente_id)
  values (p_mesa_id, 'mesa', auth.uid())
  returning id into v_order_id;

  insert into public.order_items (order_id, menu_item_id, quantidade, preco_unitario)
  select
    v_order_id,
    m.id,
    (i ->> 'quantidade')::integer,
    m.preco
  from jsonb_array_elements(p_items) as i
  join public.menu_items m
    on m.id = (i ->> 'menu_item_id')::uuid
  where m.disponivel;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Nenhum dos itens do pedido está disponível';
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.place_order(uuid, jsonb) to authenticated;
