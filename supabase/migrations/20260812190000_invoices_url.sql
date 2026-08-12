-- Faturação: link/PDF da fatura devolvido pelo provedor certificado.
-- Aplicar no SQL Editor do Supabase.

alter table public.invoices
  add column url text;
