-- Paco Restaurante — schema inicial
-- Aplicar no SQL Editor do Supabase ou via `supabase db push`.

-- ============================================================
-- ENUMS
-- ============================================================
create type public.user_role as enum ('cliente', 'staff', 'admin');
create type public.order_origem as enum ('mesa', 'uber_informativo', 'thefork_informativo', 'outro');
create type public.order_estado as enum ('pendente', 'em_preparacao', 'servido', 'pago');
create type public.alert_tipo as enum ('chamar_staff', 'pedir_conta');
create type public.alert_estado as enum ('pendente', 'atendido');
create type public.payment_metodo as enum ('dinheiro', 'multibanco_tpa', 'parceiro');
create type public.survey_destino as enum ('google_reviews', 'formulario_privado');
create type public.reservation_estado as enum ('pendente', 'confirmada', 'cancelada');

-- ============================================================
-- TABELAS
-- ============================================================

-- Criada antes de profiles por causa de profiles.mesa_habitual_id;
-- o FK de mesa_apadrinhada_cliente_id é adicionado depois (dependência circular).
create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  qr_token uuid not null unique default gen_random_uuid(),
  mesa_apadrinhada_cliente_id uuid
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'cliente',
  nome text not null default '',
  email text not null default '',
  telefone text,
  mesa_habitual_id uuid references public.restaurant_tables (id) on delete set null,
  is_loyal boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table public.restaurant_tables
  add constraint restaurant_tables_mesa_apadrinhada_cliente_id_fkey
  foreign key (mesa_apadrinhada_cliente_id)
  references public.profiles (id) on delete set null;

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  nome_pt text not null,
  nome_en text not null,
  ordem integer not null default 0
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.menu_categories (id) on delete cascade,
  nome_pt text not null,
  nome_en text not null,
  descricao_pt text not null default '',
  descricao_en text not null default '',
  preco numeric(10, 2) not null check (preco >= 0),
  foto_url text,
  disponivel boolean not null default true,
  destaque boolean not null default false
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid references public.restaurant_tables (id) on delete set null,
  origem public.order_origem not null default 'mesa',
  cliente_id uuid references public.profiles (id) on delete set null,
  staff_id uuid references public.profiles (id) on delete set null,
  estado public.order_estado not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id),
  quantidade integer not null default 1 check (quantidade > 0),
  preco_unitario numeric(10, 2) not null check (preco_unitario >= 0),
  e_oferta boolean not null default false,
  motivo_oferta text
);

create table public.table_alerts (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references public.restaurant_tables (id) on delete cascade,
  tipo public.alert_tipo not null,
  estado public.alert_estado not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  metodo public.payment_metodo not null,
  valor numeric(10, 2) not null check (valor >= 0),
  registado_por uuid not null references public.profiles (id),
  criado_em timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provedor_referencia text,
  numero_fatura text,
  total numeric(10, 2) not null check (total >= 0),
  estado text not null default 'pendente',
  criado_em timestamptz not null default now()
);

create table public.cash_closures (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  valor_caixa numeric(10, 2) not null default 0,
  valor_cofre numeric(10, 2) not null default 0,
  diferencas numeric(10, 2) not null default 0,
  registado_por uuid not null references public.profiles (id)
);

create table public.satisfaction_surveys (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.profiles (id) on delete set null,
  mesa_id uuid references public.restaurant_tables (id) on delete set null,
  pontuacao integer not null check (pontuacao between 1 and 5),
  comentario text,
  encaminhado_para public.survey_destino not null,
  criado_em timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.profiles (id) on delete set null,
  data_hora timestamptz not null,
  numero_pessoas integer not null check (numero_pessoas > 0),
  mesa_id uuid references public.restaurant_tables (id) on delete set null,
  estado public.reservation_estado not null default 'pendente'
);

-- Índices para os acessos mais frequentes
create index orders_cliente_id_idx on public.orders (cliente_id);
create index orders_estado_idx on public.orders (estado);
create index order_items_order_id_idx on public.order_items (order_id);
create index menu_items_categoria_id_idx on public.menu_items (categoria_id);
create index table_alerts_estado_idx on public.table_alerts (estado);
create index payments_order_id_idx on public.payments (order_id);
create index invoices_order_id_idx on public.invoices (order_id);
create index reservations_cliente_id_idx on public.reservations (cliente_id);
create index satisfaction_surveys_cliente_id_idx on public.satisfaction_surveys (cliente_id);

-- ============================================================
-- FUNÇÕES AUXILIARES DE RLS
-- security definer: correm como owner (postgres), que ignora o RLS
-- de profiles — evita recursão nas políticas.
-- ============================================================
create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_role() = 'admin';
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_role() in ('staff', 'admin');
$$;

-- ============================================================
-- AUTH: criação automática de perfil no registo
-- Novos registos (self-service) ficam sempre 'cliente', exceto se o
-- utilizador for criado pelo admin (service role) com
-- app_metadata.role = 'staff' | 'admin' — ver scripts/create-staff-user.mjs.
-- app_metadata só pode ser definido com a service role, nunca pelo
-- próprio utilizador, por isso staff/admin não são auto-registáveis.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, nome, email)
  values (
    new.id,
    coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'cliente'),
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um utilizador altere o próprio role (escalada de privilégios).
-- auth.uid() é null quando a alteração vem da service role — permitido.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Apenas um admin pode alterar o role de um perfil';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.table_alerts enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.cash_closures enable row level security;
alter table public.satisfaction_surveys enable row level security;
alter table public.reservations enable row level security;

-- ---------- profiles ----------
-- Cliente vê o próprio perfil; staff vê todos (precisa para o serviço).
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- Cliente edita o próprio perfil (o trigger acima impede mudar o role).
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- restaurant_tables ----------
-- Leitura para qualquer utilizador autenticado (resolver QR, escolher mesa);
-- gestão de mesas é exclusiva do admin.
create policy "tables_select" on public.restaurant_tables
  for select to authenticated
  using (true);

create policy "tables_admin_write" on public.restaurant_tables
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- menu (público para leitura, gestão só admin) ----------
create policy "menu_categories_select" on public.menu_categories
  for select to anon, authenticated
  using (true);

create policy "menu_categories_admin_write" on public.menu_categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "menu_items_select" on public.menu_items
  for select to anon, authenticated
  using (true);

create policy "menu_items_admin_write" on public.menu_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- orders ----------
create policy "orders_select" on public.orders
  for select to authenticated
  using (public.is_staff() or cliente_id = auth.uid());

-- Cliente cria pedidos próprios (sempre pendentes e sem staff atribuído);
-- staff cria pedidos de qualquer origem.
create policy "orders_insert" on public.orders
  for insert to authenticated
  with check (
    public.is_staff()
    or (cliente_id = auth.uid() and estado = 'pendente' and staff_id is null)
  );

create policy "orders_update_staff" on public.orders
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "orders_delete_admin" on public.orders
  for delete to authenticated
  using (public.is_admin());

-- ---------- order_items ----------
create policy "order_items_select" on public.order_items
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.cliente_id = auth.uid()
    )
  );

-- Cliente adiciona itens ao próprio pedido enquanto pendente; ofertas só staff.
create policy "order_items_insert" on public.order_items
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      not e_oferta
      and exists (
        select 1 from public.orders o
        where o.id = order_id
          and o.cliente_id = auth.uid()
          and o.estado = 'pendente'
      )
    )
  );

create policy "order_items_update_staff" on public.order_items
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "order_items_delete_staff" on public.order_items
  for delete to authenticated
  using (public.is_staff());

-- ---------- table_alerts ----------
-- Qualquer autenticado pode chamar o staff / pedir a conta na sua mesa.
create policy "table_alerts_insert" on public.table_alerts
  for insert to authenticated
  with check (estado = 'pendente');

create policy "table_alerts_select_staff" on public.table_alerts
  for select to authenticated
  using (public.is_staff());

create policy "table_alerts_update_staff" on public.table_alerts
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "table_alerts_delete_admin" on public.table_alerts
  for delete to authenticated
  using (public.is_admin());

-- ---------- payments ----------
create policy "payments_select_staff" on public.payments
  for select to authenticated
  using (public.is_staff());

create policy "payments_insert_staff" on public.payments
  for insert to authenticated
  with check (public.is_staff() and registado_por = auth.uid());

create policy "payments_update_staff" on public.payments
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "payments_delete_admin" on public.payments
  for delete to authenticated
  using (public.is_admin());

-- ---------- invoices ----------
create policy "invoices_select_staff" on public.invoices
  for select to authenticated
  using (public.is_staff());

create policy "invoices_insert_staff" on public.invoices
  for insert to authenticated
  with check (public.is_staff());

create policy "invoices_update_staff" on public.invoices
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "invoices_delete_admin" on public.invoices
  for delete to authenticated
  using (public.is_admin());

-- ---------- cash_closures ----------
create policy "cash_closures_select_staff" on public.cash_closures
  for select to authenticated
  using (public.is_staff());

create policy "cash_closures_insert_staff" on public.cash_closures
  for insert to authenticated
  with check (public.is_staff() and registado_por = auth.uid());

create policy "cash_closures_update_staff" on public.cash_closures
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "cash_closures_delete_admin" on public.cash_closures
  for delete to authenticated
  using (public.is_admin());

-- ---------- satisfaction_surveys ----------
-- Cliente responde em nome próprio (ou anonimamente, cliente_id null)
-- e só vê as suas respostas; staff/admin veem todas.
create policy "surveys_insert" on public.satisfaction_surveys
  for insert to authenticated
  with check (cliente_id is null or cliente_id = auth.uid());

create policy "surveys_select" on public.satisfaction_surveys
  for select to authenticated
  using (public.is_staff() or cliente_id = auth.uid());

create policy "surveys_admin_write" on public.satisfaction_surveys
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "surveys_admin_delete" on public.satisfaction_surveys
  for delete to authenticated
  using (public.is_admin());

-- ---------- reservations ----------
create policy "reservations_select" on public.reservations
  for select to authenticated
  using (public.is_staff() or cliente_id = auth.uid());

create policy "reservations_insert" on public.reservations
  for insert to authenticated
  with check (
    public.is_staff()
    or (cliente_id = auth.uid() and estado = 'pendente')
  );

-- Cliente pode mexer na própria reserva apenas para a manter pendente
-- ou cancelar; confirmação é do staff.
create policy "reservations_update" on public.reservations
  for update to authenticated
  using (public.is_staff() or cliente_id = auth.uid())
  with check (
    public.is_staff()
    or (cliente_id = auth.uid() and estado in ('pendente', 'cancelada'))
  );

create policy "reservations_delete_admin" on public.reservations
  for delete to authenticated
  using (public.is_admin());
