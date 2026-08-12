-- Planta de sala (staff) e vista de mesa por lugares (cliente).
-- Idempotente: pode correr-se mais de uma vez. Aplicar no SQL Editor.

-- ============================================================
-- 1) Modelo de dados
-- ============================================================
do $$ begin
  create type public.sala_tipo as enum ('salao', 'terraco');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mesa_forma as enum ('redonda', 'retangular');
exception when duplicate_object then null; end $$;

alter table public.restaurant_tables
  add column if not exists capacidade integer not null default 4 check (capacidade > 0),
  add column if not exists sala public.sala_tipo not null default 'salao',
  add column if not exists pos_x numeric(5, 2) not null default 50,
  add column if not exists pos_y numeric(5, 2) not null default 50,
  add column if not exists forma public.mesa_forma not null default 'retangular',
  add column if not exists staff_responsavel_id uuid references public.profiles (id) on delete set null;

-- Lugar do item na mesa (1..capacidade — validado na aplicação)
alter table public.order_items
  add column if not exists lugar_numero integer;

-- Seed de posições para as mesas existentes (1-6 salão, 7-10 terraço)
update public.restaurant_tables set capacidade = v.capacidade, sala = v.sala::public.sala_tipo,
  pos_x = v.pos_x, pos_y = v.pos_y, forma = v.forma::public.mesa_forma
from (values
  (1,  4, 'salao',   18, 22, 'redonda'),
  (2,  4, 'salao',   50, 22, 'retangular'),
  (3,  2, 'salao',   82, 22, 'retangular'),
  (4,  6, 'salao',   22, 68, 'retangular'),
  (5,  4, 'salao',   55, 68, 'redonda'),
  (6,  2, 'salao',   84, 68, 'retangular'),
  (7,  2, 'terraco', 25, 28, 'redonda'),
  (8,  4, 'terraco', 68, 28, 'retangular'),
  (9,  4, 'terraco', 25, 72, 'retangular'),
  (10, 6, 'terraco', 68, 72, 'redonda')
) as v(numero, capacidade, sala, pos_x, pos_y, forma)
where public.restaurant_tables.numero = v.numero;

-- Realtime: propaga assumir/libertar mesa a todos os ecrãs de staff
do $$ begin
  alter publication supabase_realtime add table public.restaurant_tables;
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2) Assumir / libertar mesa (staff)
-- security definer: o staff não tem política de update em
-- restaurant_tables (gestão é do admin) — esta função só mexe em
-- staff_responsavel_id, com as regras certas.
-- ============================================================
create or replace function public.atribuir_mesa(p_mesa_id uuid, p_assumir boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Apenas o staff pode assumir mesas';
  end if;

  if p_assumir then
    update public.restaurant_tables
      set staff_responsavel_id = auth.uid()
      where id = p_mesa_id and staff_responsavel_id is null;
    if not found then
      raise exception 'A mesa já tem um responsável';
    end if;
  else
    update public.restaurant_tables
      set staff_responsavel_id = null
      where id = p_mesa_id
        and (staff_responsavel_id = auth.uid() or public.is_admin());
    if not found then
      raise exception 'Só o responsável (ou o admin) pode libertar a mesa';
    end if;
  end if;
end;
$$;

grant execute on function public.atribuir_mesa(uuid, boolean) to authenticated;

-- ============================================================
-- 3) Pedidos da mesa do QR (vista de lugares do cliente)
-- O qr_token funciona como capacidade de acesso: quem o tem (está
-- fisicamente na mesa) pode ler os pedidos recentes DESSA mesa —
-- e apenas dessa. Sem alterar as políticas gerais de orders.
-- ============================================================
create or replace function public.pedidos_da_mesa(p_qr_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(pedido order by criado_em), '[]'::jsonb)
  from (
    select
      o.criado_em,
      jsonb_build_object(
        'id', o.id,
        'estado', o.estado,
        'criado_em', o.criado_em,
        'itens', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', oi.id,
            'quantidade', oi.quantidade,
            'lugar_numero', oi.lugar_numero,
            'e_oferta', oi.e_oferta,
            'nome_pt', mi.nome_pt,
            'nome_en', mi.nome_en
          ) order by oi.lugar_numero nulls last), '[]'::jsonb)
          from public.order_items oi
          join public.menu_items mi on mi.id = oi.menu_item_id
          where oi.order_id = o.id
        )
      ) as pedido
    from public.orders o
    join public.restaurant_tables m on m.id = o.mesa_id
    where m.qr_token = p_qr_token
      and o.criado_em >= now() - interval '12 hours'
  ) t;
$$;

grant execute on function public.pedidos_da_mesa(uuid) to anon, authenticated;

-- ============================================================
-- 4) place_order / place_staff_order passam a aceitar lugar_numero
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

  insert into public.order_items (order_id, menu_item_id, quantidade, preco_unitario, lugar_numero)
  select
    v_order_id,
    m.id,
    (i ->> 'quantidade')::integer,
    m.preco,
    nullif(i ->> 'lugar_numero', '')::integer
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

  insert into public.order_items (order_id, menu_item_id, quantidade, preco_unitario, lugar_numero)
  select
    v_order_id,
    m.id,
    (i ->> 'quantidade')::integer,
    m.preco,
    nullif(i ->> 'lugar_numero', '')::integer
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
