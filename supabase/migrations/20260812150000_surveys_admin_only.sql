-- Inquéritos de satisfação: as respostas (incl. reclamações privadas)
-- passam a ser visíveis apenas para o admin — o staff deixa de as ler.
-- Cada cliente continua a ver as suas. Aplicar no SQL Editor.

drop policy "surveys_select" on public.satisfaction_surveys;

create policy "surveys_select" on public.satisfaction_surveys
  for select to authenticated
  using (public.is_admin() or cliente_id = auth.uid());
