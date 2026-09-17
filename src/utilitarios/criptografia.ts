/**
 * Utilitário de Criptografia e Hashing para Senhas de Usuários.
 * Utiliza a API nativa Web Crypto (SHA-256), compatível com navegadores e Node.js.
 */

/**
 * Gera o hash SHA-256 de uma senha em formato hexadecimal (64 caracteres minúsculos).
 * Exemplo: '123456' -> '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
 */
export async function gerarHashSenha(senha: string): Promise<string> {
  if (!senha) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);

  // Web Crypto API nativa
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifica se a senha digitada pelo usuário corresponde à senha armazenada no banco.
 * Suporta:
 * 1. Senha com hash SHA-256 (64 caracteres hexadecimais).
 * 2. Senha em texto plano (compatibilidade retroativa durante migração).
 */
export async function verificarSenha(senhaDigitada: string, senhaArmazenada: string): Promise<boolean> {
  if (!senhaDigitada || !senhaArmazenada) return false;

  const armazenadaLimpa = senhaArmazenada.trim();
  const hashDigitada = await gerarHashSenha(senhaDigitada);

  // 1. Comparação direta com hash SHA-256
  if (armazenadaLimpa.toLowerCase() === hashDigitada.toLowerCase()) {
    return true;
  }

  // 2. Comparação em texto plano (fallback seguro antes da migração do banco)
  if (armazenadaLimpa === senhaDigitada) {
    return true;
  }

  return false;
}

