-- ============================================================================
-- Criptografia de Senhas de Usuários (Hotel Fazenda Anew)
-- Algoritmo: SHA-256 (64 caracteres hexadecimais)
-- 
-- Instruções de Execução:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard).
-- 2. No menu lateral esquerdo, clique em "SQL Editor".
-- 3. Crie uma nova query, cole todo o conteúdo deste arquivo e clique em "Run".
-- ============================================================================

-- 1. Habilitar a extensão pgcrypto no PostgreSQL (nativa do Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Atualizar as senhas atuais dos usuários para hash SHA-256
-- A condição length(senha) < 64 garante que se a query for executada mais de uma vez,
-- senhas que já foram criptografadas não serão criptografadas novamente por engano.
UPDATE public.usuario
SET 
  senha = encode(digest(senha, 'sha256'), 'hex'),
  dataoperacao = now(),
  naturezaoperacao = 'UPDATE'
WHERE length(senha) < 64;

-- 3. Caso queira redefinir a senha de um usuário específico manualmente no futuro:
-- Exemplo: Redefinir a senha do Administrador para '123456':
-- UPDATE public.usuario 
-- SET senha = encode(digest('123456', 'sha256'), 'hex'),
--     dataoperacao = now(),
--     naturezaoperacao = 'UPDATE'
-- WHERE email = 'francisco.jhonny@hotmail.com';

-- 4. Consulta para visualizar os usuários cadastrados e conferir os hashes
SELECT 
  u.usuarioid,
  u.perfilid,
  p.descricao AS perfil,
  u.nome,
  u.email,
  u.senha AS senha_sha256_64chars,
  length(u.senha) AS tamanho_senha,
  u.ativo,
  u.dataoperacao
FROM public.usuario u
LEFT JOIN public.perfil p ON p.perfilid = u.perfilid
ORDER BY u.usuarioid ASC;

