-- Campanhas e dias especiais geridos pelo admin (substitui os dados
-- fixos em código na página do QR). Aplicar no SQL Editor do Supabase.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  titulo_pt text not null,
  titulo_en text not null,
  descricao_pt text not null default '',
  descricao_en text not null default '',
  emoji text,
  imagem_url text,
  valido_de date,
  valido_ate date,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.campaigns enable row level security;

-- Leitura pública (a página da mesa é acedida por anónimos);
-- gestão exclusiva do admin.
create policy "campaigns_select" on public.campaigns
  for select to anon, authenticated
  using (true);

create policy "campaigns_admin_write" on public.campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Migra as três campanhas fictícias que estavam em código
insert into public.campaigns (titulo_pt, titulo_en, descricao_pt, descricao_en, emoji, ordem) values
  ('Terças do Bacalhau', 'Codfish Tuesdays',
   'Todas as terças, o nosso Bacalhau à Braga com 20% de desconto ao jantar.',
   'Every Tuesday, our Bacalhau à Braga at 20% off for dinner.', '🐟', 1),
  ('Menu de Almoço — 12€', 'Lunch Menu — €12',
   'Dias úteis das 12h às 15h: prato do dia, bebida, café e sobremesa.',
   'Weekdays from 12pm to 3pm: dish of the day, drink, coffee and dessert.', '🍽', 2),
  ('Aniversariantes', 'Birthdays',
   'Faz anos? A sobremesa é por nossa conta — basta avisar a equipa.',
   'Is it your birthday? Dessert is on us — just let the team know.', '🎂', 3);
