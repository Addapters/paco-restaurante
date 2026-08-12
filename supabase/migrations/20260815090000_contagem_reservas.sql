-- Contagem de reservas por horário, para a nova página pública de
-- reservas (aproximação simples de capacidade — sem gestão real por
-- horário, que fica para uma fase futura configurável pelo admin).
-- security definer: devolve apenas contagens agregadas, nunca dados
-- de clientes, por isso pode ser chamada por visitantes anónimos sem
-- violar o RLS de reservations (que restringe leitura a linha própria
-- ou staff/admin).
-- Idempotente. Aplicar no SQL Editor.

create or replace function public.contagem_reservas_por_hora(p_data date)
returns table (hora text, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select to_char(data_hora, 'HH24:MI') as hora, count(*) as total
  from public.reservations
  where data_hora::date = p_data
    and estado <> 'cancelada'
  group by 1;
$$;

grant execute on function public.contagem_reservas_por_hora(date) to anon, authenticated;
