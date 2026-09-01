// src/scripts/testarConexaoSimples.ts
import { createClient } from '@supabase/supabase-js';

async function executarTeste() {
  // Carregar variáveis de ambiente
  const SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
  const SUPABASE_ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';

  console.log('🔍 Testando conexão com Supabase...');
  console.log('=====================================');
  console.log('📡 URL:', SUPABASE_URL);
  console.log('🔑 KEY:', SUPABASE_ANON_KEY ? '✅ Configurada (' + SUPABASE_ANON_KEY.substring(0, 15) + '...)' : '❌ FALTANDO');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('\n❌ ERRO: Variáveis de ambiente não configuradas!');
    console.log('\nCrie um arquivo .env.local com:');
    console.log('VITE_SUPABASE_URL=sua_url');
    console.log('VITE_SUPABASE_ANON_KEY=sua_chave');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('\n✅ Cliente Supabase criado!');
    console.log('\n📊 Testando consulta...');
    
    // Testar Perfil
    const { data: perfis, error: erroPerfil } = await supabase
      .from('Perfil')
      .select('*');

    if (erroPerfil) {
      console.error('❌ Erro na tabela Perfil:', erroPerfil.message);
      
      // Verificar se é erro de tabela não existente
      if (erroPerfil.message.includes('relation') && erroPerfil.message.includes('does not exist')) {
        console.log('\n💡 As tabelas ainda não foram criadas!');
        console.log('   Execute o script SQL no Supabase primeiro.');
      }
    } else {
      console.log(`✅ ${perfis?.length || 0} perfis encontrados:`);
      perfis?.forEach((p: any) => console.log(`   - ${p.Descricao} (ID: ${p.PerfilId})`));
    }

    // Testar Usuario
    console.log('\n👤 Testando Usuario...');
    const { data: usuarios, error: erroUsuario } = await supabase
      .from('Usuario')
      .select('UsuarioId, Nome, Email');

    if (erroUsuario) {
      console.error('❌ Erro:', erroUsuario.message);
    } else {
      console.log(`✅ ${usuarios?.length || 0} usuários encontrados:`);
      usuarios?.forEach((u: any) => console.log(`   - ${u.Nome} (${u.Email})`));
    }

    // Testar Quarto
    console.log('\n🏠 Testando Quarto...');
    const { data: quartos, error: erroQuarto } = await supabase
      .from('Quarto')
      .select('QuartoId, Numero, Bloco, Status')
      .limit(5);

    if (erroQuarto) {
      console.error('❌ Erro:', erroQuarto.message);
    } else {
      console.log(`✅ ${quartos?.length || 0} quartos encontrados (mostrando 5):`);
      quartos?.forEach((q: any) => console.log(`   - Quarto ${q.Numero} (${q.Bloco}) - ${q.Status}`));
    }

    console.log('\n=====================================');
    console.log('✅ Teste concluído!');

    // Credenciais
    console.log('\n🔑 Credenciais de acesso:');
    console.log('   Email: francisco.jhonny@hotmail.com');
    console.log('   Senha: 123456');
    console.log('   Email: joao@email.com');
    console.log('   Senha: 123456');

  } catch (error: any) {
    console.error('❌ Erro:', error?.message);
  }
}

executarTeste();