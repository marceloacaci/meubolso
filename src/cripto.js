// S6-3: criptografia opcional do arquivo de dados (AES-256-GCM).
// Funcoes PURAS (node:crypto) para facilitar testes. O renderer nao usa este
// modulo — apenas o processo principal (main.js) e os testes.
const crypto = require('node:crypto');

const ALGO = 'aes-256-gcm';
const PBKDF2 = { iteracoes: 200000, digest: 'sha256', tamanhoChave: 32 };
const PREFIXO = 'MBENC1';

function derivarChave(senha, salt) {
  return crypto.pbkdf2Sync(senha, salt, PBKDF2.iteracoes, PBKDF2.tamanhoChave, PBKDF2.digest);
}

// Retorna string "MBENC1:<salt>:<iv>:<tag>:<ciphertext>" (tudo base64).
function criptografar(senha, texto) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const chave = derivarChave(senha, salt);
  const cipher = crypto.createCipheriv(ALGO, chave, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(String(texto), 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIXO,
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    ct.toString('base64'),
  ].join(':');
}

// Recebe o texto criptografado (formato acima) e a senha; retorna o texto limpo.
// Falha (throw) se a senha estiver errada (tag GCM nao confere) ou formato invalido.
function descriptografar(senha, dados) {
  const partes = String(dados).trim().split(':');
  if (partes[0] !== PREFIXO || partes.length !== 5) {
    throw new Error('formato de arquivo criptografado invalido');
  }
  const salt = Buffer.from(partes[1], 'base64');
  const iv = Buffer.from(partes[2], 'base64');
  const tag = Buffer.from(partes[3], 'base64');
  const ct = Buffer.from(partes[4], 'base64');
  const chave = derivarChave(senha, salt);
  const decipher = crypto.createDecipheriv(ALGO, chave, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

// Heuristica: o arquivo esta criptografado?
function eArquivoCriptografado(conteudo) {
  return typeof conteudo === 'string' && conteudo.startsWith(PREFIXO + ':');
}

module.exports = { criptografar, descriptografar, eArquivoCriptografado, PREFIXO, sha256Arquivo };

// B10 (S8): hash SHA-256 do conteúdo do arquivo de dados, para detecção de
// corrupção ANTES de exibir. Função pura e testável (node:crypto).
function sha256Arquivo(conteudo) {
  return crypto.createHash('sha256').update(String(conteudo), 'utf8').digest('hex');
}
