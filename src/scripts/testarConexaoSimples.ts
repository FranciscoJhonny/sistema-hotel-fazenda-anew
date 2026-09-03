// src/scripts/testarConexaoSimples.ts
import { createClient } from '@supabase/supabase-js';

async function executarTeste() {
  // Carregar variáveis de ambiente
  const SUPABASE_URL = (import.meta as any)?.env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
  const SUPABASE_ANON_KEY = (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('\n❌ ERRO: Variáveis de ambiente não configuradas!');
    return;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Testar Perfil
    const { data: perfis, error: erroPerfil } = await supabase
      .from('Perfil')
      .select('*');

    if (erroPerfil) {
      console.error('❌ Erro na tabela Perfil:', erroPerfil.message);
    }

    // Testar Usuario
    const { data: usuarios, error: erroUsuario } = await supabase
      .from('Usuario')
      .select('UsuarioId, Nome, Email');

    if (erroUsuario) {
      console.error('❌ Erro:', erroUsuario.message);
    }

    // Testar Quarto
    const { data: quartos, error: erroQuarto } = await supabase
      .from('Quarto')
      .select('QuartoId, Numero, Bloco, Status')
      .limit(5);

    if (erroQuarto) {
      console.error('❌ Erro:', erroQuarto.message);
    }

  } catch (error: any) {
    console.error('❌ Erro:', error?.message);
  }
}

executarTeste();