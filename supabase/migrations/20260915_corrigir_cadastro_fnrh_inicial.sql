-- Corrige cadastro_fnrh já criado antes da alteração do formulário público.
-- Permite criar o link/token antes de o cliente preencher os dados.

alter table if exists public.cadastro_fnrh
  alter column nomecompleto drop not null,
  alter column cpf drop not null,
  alter column telefone drop not null;
