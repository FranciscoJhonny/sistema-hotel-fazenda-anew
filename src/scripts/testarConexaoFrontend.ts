// src/scripts/testarConexaoFrontend.ts
import { obterClienteSupabase } from '../lib/supabaseCliente';

async function testarConexao() {
  console.log('🔍 Testando conexão com Supabase...');
  console.log('=====================================');

  // 1. Obter cliente
  const cliente = obterClienteSupabase();
  
  if (!cliente) {
    console.error('❌ Cliente Supabase NÃO inicializado!');
    console.log('   Verifique suas variáveis de ambiente:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return;
  }
  
  console.log('✅ Cliente Supabase inicializado com sucesso!');

  // 2. Testar consulta na tabela Perfil
  console.log('\n📊 Testando consulta na tabela Perfil...');
  const { data: perfis, error: erroPerfil } = await cliente
    .from('Perfil')
    .select('*');

  if (erroPerfil) {
    console.error('❌ Erro ao buscar perfis:', erroPerfil.message);
    console.log('   Verifique se as tabelas foram criadas.');
  } else {
    console.log(`✅ ${perfis?.length || 0} perfis encontrados:`);
    perfis?.forEach((p: any) => console.log(`   - ${p.Descricao} (ID: ${p.PerfilId})`));
  }

  // 3. Testar consulta na tabela Usuario
  console.log('\n👤 Testando consulta na tabela Usuario...');
  const { data: usuarios, error: erroUsuario } = await cliente
    .from('Usuario')
    .select('UsuarioId, Nome, Email, PerfilId');

  if (erroUsuario) {
    console.error('❌ Erro ao buscar usuários:', erroUsuario.message);
  } else {
    console.log(`✅ ${usuarios?.length || 0} usuários encontrados:`);
    usuarios?.forEach((u: any) => console.log(`   - ${u.Nome} (${u.Email})`));
  }

  // 4. Testar consulta na tabela Quarto
  console.log('\n🏠 Testando consulta na tabela Quarto...');
  const { data: quartos, error: erroQuarto } = await cliente
    .from('Quarto')
    .select('QuartoId, Numero, Bloco, Status');

  if (erroQuarto) {
    console.error('❌ Erro ao buscar quartos:', erroQuarto.message);
  } else {
    console.log(`✅ ${quartos?.length || 0} quartos encontrados:`);
    quartos?.forEach((q: any) => console.log(`   - Quarto ${q.Numero} (${q.Bloco}) - ${q.Status}`));
  }

  // 5. Testar autenticação
  console.log('\n🔑 Testando autenticação...');
  const { data: authUser, error: authError } = await cliente
    .from('Usuario')
    .select('UsuarioId, Nome, Email')
    .eq('Email', 'francisco.jhonny@hotmail.com')
    .single();

  if (authError) {
    console.error('❌ Erro ao buscar usuário admin:', authError.message);
  } else if (authUser) {
    console.log(`✅ Usuário admin encontrado:`);
    console.log(`   - Nome: ${authUser.Nome}`);
    console.log(`   - Email: ${authUser.Email}`);
    console.log(`   - Senha: 123456`);
  }

  console.log('\n=====================================');
  console.log('✅ Teste de conexão concluído!');
}

// Executar
testarConexao();