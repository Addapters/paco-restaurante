-- Pedido criado pelo staff (na mesa ou registo informativo de plataforma
-- externa), numa única transação, com preços vindos de menu_items.
-- Aplicar no SQL Editor do Supabase.

create or replace function public.place_staff_order(
  p_mesa_id uuid,
  p_origem public.order_origem,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
  v_count integer;
begin
  if not public.is_staff() then
    raise exception 'Apenas o staff pode registar pedidos por esta via';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'O pedido tem de ter pelo menos um item';
  end if;

  insert into public.orders (mesa_id, origem, staff_id)
  values (p_mesa_id, p_origem, auth.uid())
  returning id into v_order_id;

  -- Sem filtro de "disponivel": o staff pode registar qualquer item
  -- (ex.: pedido externo de um prato entretanto esgotado na sala).
  insert into public.order_items (order_id, menu_item_id, quantidade, preco_unitario)
  select
    v_order_id,
    m.id,
    (i ->> 'quantidade')::integer,
    m.preco
  from jsonb_array_elements(p_items) as i
  join public.menu_items m
    on m.id = (i ->> 'menu_item_id')::uuid;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'Nenhum item válido no pedido';
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.place_staff_order(uuid, public.order_origem, jsonb) to authenticated;
