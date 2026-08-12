-- Reservas públicas, newsletter e definições do site.
-- Aplicar no SQL Editor do Supabase.

-- 1) Dados de contacto na reserva (o formulário é público; o contacto
--    não depende de haver perfil preenchido)
alter table public.reservations
  add column nome_contacto text not null default '',
  add column telefone_contacto text,
  add column email_contacto text;

-- 2) Subscrições de newsletter (sem envio automático nesta fase)
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Qualquer visitante pode subscrever; a lista só é visível ao admin.
create policy "newsletter_insert" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

create policy "newsletter_admin_select" on public.newsletter_subscribers
  for select to authenticated
  using (public.is_admin());

create policy "newsletter_admin_delete" on public.newsletter_subscribers
  for delete to authenticated
  using (public.is_admin());

-- 3) Definições do site (linha única): links informativos + flags de
--    integrações futuras (TheFork/Uber continuam apenas informativos)
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  google_reviews_url text,
  instagram_url text,
  facebook_url text,
  integracao_thefork_ativa boolean not null default false,
  integracao_uber_ativa boolean not null default false
);

alter table public.site_settings enable row level security;

create policy "site_settings_select" on public.site_settings
  for select to anon, authenticated
  using (true);

create policy "site_settings_admin_write" on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.site_settings (id) values (1);
