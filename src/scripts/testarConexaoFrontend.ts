// src/scripts/testarConexaoFrontend.ts
import { obterClienteSupabase } from '../lib/supabaseCliente';

async function testarConexao() {
  // 1. Obter cliente
  const cliente = obterClienteSupabase();
  
  if (!cliente) {
    console.error('❌ Cliente Supabase NÃO inicializado!');
    return;
  }

  // 2. Testar consulta na tabela Perfil
  const { data: perfis, error: erroPerfil } = await cliente
    .from('Perfil')
    .select('*');

  if (erroPerfil) {
    console.error('❌ Erro ao buscar perfis:', erroPerfil.message);
  }

  // 3. Testar consulta na tabela Usuario
  const { data: usuarios, error: erroUsuario } = await cliente
    .from('Usuario')
    .select('UsuarioId, Nome, Email, PerfilId');

  if (erroUsuario) {
    console.error('❌ Erro ao buscar usuários:', erroUsuario.message);
  }

  // 4. Testar consulta na tabela Quarto
  const { data: quartos, error: erroQuarto } = await cliente
    .from('Quarto')
    .select('QuartoId, Numero, Bloco, Status');

  if (erroQuarto) {
    console.error('❌ Erro ao buscar quartos:', erroQuarto.message);
  }

  // 5. Testar autenticação
  const { data: authUser, error: authError } = await cliente
    .from('Usuario')
    .select('UsuarioId, Nome, Email')
    .eq('Email', 'francisco.jhonny@hotmail.com')
    .single();

  if (authError) {
    console.error('❌ Erro ao buscar usuário admin:', authError.message);
  }
}

// Executar
testarConexao();