-- Módulo perfil de cliente: subscrição de newsletter + índice para
-- a lógica de mesa apadrinhada. Aplicar no SQL Editor do Supabase.

-- Campo de subscrição (o envio real de campanhas fica para mais tarde;
-- por agora só guardamos o consentimento do cliente).
alter table public.profiles
  add column newsletter_subscrito boolean not null default false;

create index restaurant_tables_mesa_apadrinhada_idx
  on public.restaurant_tables (mesa_apadrinhada_cliente_id)
  where mesa_apadrinhada_cliente_id is not null;
