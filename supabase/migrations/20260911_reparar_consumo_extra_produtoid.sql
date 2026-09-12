-- Reparo para bancos onde consumo_extra foi criada sem a coluna do produto.
alter table if exists public.consumo_extra
  add column if not exists produtoid integer;

create index if not exists consumo_extra_produtoid_idx
  on public.consumo_extra (produtoid)
  where ativo = true;