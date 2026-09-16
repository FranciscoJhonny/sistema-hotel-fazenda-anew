-- ============================================================================
-- Migração: Garantir vinculação de reservaid e status RESERVA_CRIADA
-- ============================================================================

-- 1. Garante coluna reservaid na tabela cadastro_fnrh
alter table if exists public.cadastro_fnrh
  add column if not exists reservaid integer null references public.reserva(reservaid);

-- 2. Garante coluna reservaid na tabela acompanhante
alter table if exists public.acompanhante
  add column if not exists reservaid integer null references public.reserva(reservaid);

-- 3. Garante coluna reservaid na tabela cadastro_fnrh_acompanhante
alter table if exists public.cadastro_fnrh_acompanhante
  add column if not exists reservaid integer null references public.reserva(reservaid);

-- 4. Garante que a constraint de status permite 'RESERVA_CRIADA'
alter table if exists public.cadastro_fnrh
  drop constraint if exists cadastro_fnrh_status_check;

alter table if exists public.cadastro_fnrh
  add constraint cadastro_fnrh_status_check
  check (status in (
    'AGUARDANDO_PAGAMENTO',
    'LIBERADA_PARA_RESERVA',
    'RESERVA_CRIADA',
    'CANCELADA'
  ));

-- 5. Índice para consultas rápidas de reservas vinculadas
create index if not exists cadastro_fnrh_reserva_idx
  on public.cadastro_fnrh(reservaid);

