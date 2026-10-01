-- ============================================================================
-- Migração: Adicionar campo "numero" em public.hospede e public.cadastro_fnrh
-- Descrição: Permite registrar o Número / Lote / Bloco / Apartamento do endereço
-- ============================================================================

-- 1. Adiciona a coluna "numero" na tabela public.hospede
alter table public.hospede
  add column if not exists numero text;

-- 2. Adiciona a coluna "numero" na tabela public.cadastro_fnrh
alter table public.cadastro_fnrh
  add column if not exists numero text;

-- 3. Atualiza a RPC salvar_cadastro_fnrh_por_token para incluir o campo numero
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
         numero = nullif(trim(p_dados->>'numero'), ''),
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

  return jsonb_build_object('sucesso', true, 'cadastroid', cadastro_id);
end;
$$;
