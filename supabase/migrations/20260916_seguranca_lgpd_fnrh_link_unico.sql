-- ============================================================================
-- Migração: Segurança LGPD e Link de Uso Único para FNRH
-- ============================================================================
-- 1. Se o cliente já enviou a ficha (declaracao_aceita = true) ou se o sinal
--    já foi confirmado / reserva criada, a função NÃO expõe dados pessoais
--    sensíveis (CPF, RG, passaporte, endereço, etc.) na internet.
-- 2. Impede que o formulário seja reeditado após o envio inicial (Uso Único).
-- ============================================================================

create or replace function public.obter_cadastro_fnrh_por_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  select *
    into c
    from public.cadastro_fnrh
   where token_acesso = p_token;

  -- 1. Se não existir o token
  if c is null then
    raise exception 'Link inválido ou não encontrado.';
  end if;

  -- 2. Se o link foi cancelado
  if c.status = 'CANCELADA' then
    raise exception 'Este link foi cancelado pelo hotel.';
  end if;

  -- 3. Se o link expirou (mais de 7 dias)
  if c.token_expira_em < now() then
    raise exception 'Este link expirou. Por favor, solicite um novo link à recepção do hotel.';
  end if;

  -- 4. SEGURANÇA LGPD & LINK DE USO ÚNICO:
  -- Se o cliente já enviou a ficha (declaracao_aceita = true) OU o sinal já foi confirmado / reserva criada:
  -- Não expõe dados sensíveis na internet. Retorna apenas flag 'ja_enviado: true'.
  if coalesce(c.declaracao_aceita, false) = true or c.status in ('LIBERADA_PARA_RESERVA', 'RESERVA_CRIADA') then
    return jsonb_build_object(
      'ja_enviado', true,
      'status', c.status,
      'nomecompleto', c.nomecompleto,
      'cadastro', jsonb_build_object(
        'cadastroid', c.cadastroid,
        'status', c.status,
        'nomecompleto', c.nomecompleto,
        'declaracao_aceita', true
      ),
      'acompanhantes', '[]'::jsonb
    );
  end if;

  -- 5. Se ainda NÃO foi preenchido, devolve os dados para preenchimento
  -- (excluindo tokens e IDs internos de auditoria)
  return jsonb_build_object(
    'ja_enviado', false,
    'cadastro', to_jsonb(c) - 'token_acesso' - 'token_expira_em' - 'pagamento_confirmado_por',
    'acompanhantes', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.acompanhanteid)
        from public.cadastro_fnrh_acompanhante a
       where a.cadastroid = c.cadastroid
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.salvar_cadastro_fnrh_por_token(
  p_token text,
  p_dados jsonb,
  p_acompanhantes jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cadastro_id bigint;
  ja_aceito boolean;
  status_atual text;
begin
  select cadastroid, coalesce(declaracao_aceita, false), status
    into cadastro_id, ja_aceito, status_atual
    from public.cadastro_fnrh
   where token_acesso = p_token
     and token_expira_em > now();

  if cadastro_id is null then
    raise exception 'Cadastro não encontrado ou link expirado.';
  end if;

  if status_atual = 'CANCELADA' then
    raise exception 'Este link de cadastro foi cancelado.';
  end if;

  -- Bloqueio de Uso Único: Se já foi enviado ou liberado, não permite sobrescrever
  if ja_aceito = true or status_atual in ('LIBERADA_PARA_RESERVA', 'RESERVA_CRIADA') then
    raise exception 'Este cadastro já foi enviado anteriormente e não pode mais ser alterado.';
  end if;

  -- Salva os dados enviados pelo cliente
  update public.cadastro_fnrh
     set nomecompleto = coalesce(nullif(trim(p_dados->>'nomecompleto'), ''), nomecompleto),
         cpf = coalesce(nullif(trim(p_dados->>'cpf'), ''), cpf),
         rg = nullif(trim(p_dados->>'rg'), ''),
         passaporte = nullif(trim(p_dados->>'passaporte'), ''),
         datanascimento = nullif(p_dados->>'datanascimento', '')::date,
         nacionalidade = nullif(trim(p_dados->>'nacionalidade'), ''),
         sexo = nullif(p_dados->>'sexo', ''),
         telefone = coalesce(nullif(trim(p_dados->>'telefone'), ''), telefone),
         email = nullif(trim(p_dados->>'email'), ''),
         endereco = nullif(trim(p_dados->>'endereco'), ''),
         cidade = nullif(trim(p_dados->>'cidade'), ''),
         estado = nullif(trim(p_dados->>'estado'), ''),
         cep = nullif(trim(p_dados->>'cep'), ''),
         profissao = nullif(trim(p_dados->>'profissao'), ''),
         proximodestino = nullif(trim(p_dados->>'proximodestino'), ''),
         ultimaprocedencia = nullif(trim(p_dados->>'ultimaprocedencia'), ''),
         cpfresponsavelmenor = nullif(trim(p_dados->>'cpfresponsavelmenor'), ''),
         dataentrada = nullif(p_dados->>'dataentrada', '')::date,
         horarioprevistochegada = nullif(p_dados->>'horarioprevistochegada', '')::time,
         datasaida = nullif(p_dados->>'datasaida', '')::date,
         horarioprevistasaida = nullif(p_dados->>'horarioprevistasaida', '')::time,
         motivoviagem = nullif(trim(p_dados->>'motivoviagem'), ''),
         transporte = nullif(trim(p_dados->>'transporte'), ''),
         placa = nullif(trim(p_dados->>'placa'), ''),
         modelocor = nullif(trim(p_dados->>'modelocor'), ''),
         numerohospedes = greatest(1, coalesce((p_dados->>'numerohospedes')::integer, numerohospedes)),
         adultos = greatest(0, coalesce((p_dados->>'adultos')::integer, adultos)),
         criancas = greatest(0, coalesce((p_dados->>'criancas')::integer, criancas)),
         forma_pagamento = nullif(p_dados->>'forma_pagamento', ''),
         alergias_restricoes = nullif(trim(p_dados->>'alergias_restricoes'), ''),
         solicitacoes_especiais = nullif(trim(p_dados->>'solicitacoes_especiais'), ''),
         declaracao_aceita = true,
         data_declaracao = now(),
         dataoperacao = now(),
         naturezaoperacao = 'UPDATE'
   where cadastroid = cadastro_id;

  -- Atualiza acompanhantes da FNRH
  delete from public.cadastro_fnrh_acompanhante where cadastroid = cadastro_id;
  insert into public.cadastro_fnrh_acompanhante (cadastroid, nomecompleto, documento, datanascimento, menoridade, cpfresponsavel, observacoes)
  select cadastro_id, item->>'nomecompleto', nullif(item->>'documento', ''), nullif(item->>'datanascimento', '')::date,
         coalesce((item->>'menoridade')::boolean, false), nullif(item->>'cpfresponsavel', ''), nullif(item->>'observacoes', '')
    from jsonb_array_elements(coalesce(p_acompanhantes, '[]'::jsonb)) item
   where nullif(trim(item->>'nomecompleto'), '') is not null;

  return jsonb_build_object('cadastroid', cadastro_id, 'status', 'AGUARDANDO_PAGAMENTO', 'sucesso', true);
end;
$$;

revoke all on function public.obter_cadastro_fnrh_por_token(text) from public;
revoke all on function public.salvar_cadastro_fnrh_por_token(text, jsonb, jsonb) from public;
grant execute on function public.obter_cadastro_fnrh_por_token(text) to anon, authenticated;
grant execute on function public.salvar_cadastro_fnrh_por_token(text, jsonb, jsonb) to anon, authenticated;

