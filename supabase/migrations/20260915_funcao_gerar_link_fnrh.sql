-- Função auxiliar para gerar link FNRH via SQL Editor ou RPC
-- O frontend já gera o link e insere automaticamente via FnrhService.ts,
-- mas esta função fica disponível caso você queira gerar diretamente pelo Supabase SQL Editor.

create or replace function public.gerar_link_fnrh(
  p_nomecompleto text default null,
  p_telefone text default null,
  p_email text default null,
  p_dataentrada date default null,
  p_datasaida date default null,
  p_adultos integer default 1,
  p_criancas integer default 0,
  p_solicitacoes_especiais text default null
)
returns table (
  cadastroid bigint,
  token_acesso text,
  token_expira_em timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_id bigint;
  v_expira timestamptz;
  v_status text;
begin
  v_token := md5(random()::text || clock_timestamp()::text || txid_current()::text);
  
  insert into public.cadastro_fnrh (
    token_acesso,
    nomecompleto,
    telefone,
    email,
    dataentrada,
    datasaida,
    adultos,
    criancas,
    numerohospedes,
    solicitacoes_especiais,
    status,
    datainclusao,
    dataoperacao
  )
  values (
    v_token,
    p_nomecompleto,
    p_telefone,
    p_email,
    p_dataentrada,
    p_datasaida,
    greatest(1, coalesce(p_adultos, 1)),
    greatest(0, coalesce(p_criancas, 0)),
    greatest(1, coalesce(p_adultos, 1) + coalesce(p_criancas, 0)),
    p_solicitacoes_especiais,
    'AGUARDANDO_PAGAMENTO',
    now(),
    now()
  )
  returning
    cadastro_fnrh.cadastroid,
    cadastro_fnrh.token_acesso,
    cadastro_fnrh.token_expira_em,
    cadastro_fnrh.status
  into
    v_id,
    v_token,
    v_expira,
    v_status;

  return query select v_id, v_token, v_expira, v_status;
end;
$$;

grant execute on function public.gerar_link_fnrh(text, text, text, date, date, integer, integer, text) to anon, authenticated;

