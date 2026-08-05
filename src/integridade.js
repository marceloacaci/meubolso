/*
 * Integridade de dados do MeuBolso — versionamento, migração e validação.
 * Extraído de main.js (Sprint 2 / Etapa 3) para ser testável em Node (sem Electron).
 *
 * Cobre as lacunas L4 (fallback para backup na carga), L7 (JSON Schema versionado)
 * e L9 (versionamento/migração de schema) do AS-BUILT.
 */
const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

const CURRENT_SCHEMA_VERSION = 1;

// JSON Schema versionado (ver também docs/schema/meubolso.schema.json).
// Na CARGA toleramos ausência de schemaVersion (dados legados); a migração
// (migrarSchema) adiciona a versão. O schema em docs/schema exige schemaVersion
// para novos dados gravados.
const SCHEMA = {
  type: 'object',
  required: ['dividas', 'pagamentos', 'carteiras', 'configuracoes'],
  properties: {
    schemaVersion: { type: 'integer', minimum: 1 },
    dividas: { type: 'array' },
    pagamentos: { type: 'array' },
    carteiras: { type: 'array' },
    configuracoes: { type: 'object' }
  }
};

// ---------- Migrações idempotentes ----------
// Cada função migra de (versão-1) -> versão. Roda em cadeia até a versão atual.
// Idempotente: se já estiver na versão alvo, não altera nada.
const MIGRACOES = {
  // 0 -> 1: garante campos obrigatórios mínimos e marca schemaVersion=1.
  1: (d) => {
    d.dividas = Array.isArray(d.dividas) ? d.dividas : [];
    d.pagamentos = Array.isArray(d.pagamentos) ? d.pagamentos : [];
    d.carteiras = Array.isArray(d.carteiras) ? d.carteiras : [];
    d.configuracoes = (d.configuracoes && typeof d.configuracoes === 'object')
      ? d.configuracoes
      : { moeda: 'BRL' };
    if (typeof d.configuracoes.moeda !== 'string') d.configuracoes.moeda = 'BRL';
    for (const div of d.dividas) {
      if (!Array.isArray(div.parcelas)) div.parcelas = [];
      for (const p of div.parcelas) {
        if (typeof p.valorPago !== 'number') p.valorPago = 0;
        if (typeof p.status !== 'string') p.status = 'pendente';
      }
    }
    return d;
  }
};

function migrarSchema(d) {
  let versao = Number(d.schemaVersion) || 0;
  while (versao < CURRENT_SCHEMA_VERSION) {
    const prox = versao + 1;
    const fn = MIGRACOES[prox];
    if (typeof fn !== 'function') break; // sem migração definida: para
    fn(d);
    d.schemaVersion = prox;
    versao = prox;
  }
  return d;
}

function definirSchemaVersion(d) {
  if (!d.schemaVersion) d.schemaVersion = CURRENT_SCHEMA_VERSION;
  return d;
}

// ---------- Validação ----------
const ajv = new Ajv({ allErrors: true, strict: false });
const validarComSchema = ajv.compile(SCHEMA);

// Retorna { ok: boolean, erros: string[] }
function validarEstrutura(d) {
  const ok = validarComSchema(d);
  if (ok) return { ok: true, erros: [] };
  const erros = (validarComSchema.errors || []).map(
    (e) => (e.instancePath || '/') + ' ' + e.message
  );
  return { ok: false, erros };
}

// Verifica se um arquivo JSON é legível E estruturalmente válido.
function arquivoEhValido(caminho) {
  try {
    const conteudo = fs.readFileSync(caminho, 'utf8');
    if (!conteudo.trim()) return { ok: false, motivo: 'arquivo vazio' };
    const obj = JSON.parse(conteudo);
    const v = validarEstrutura(obj);
    if (!v.ok) return { ok: false, motivo: 'estrutura inválida: ' + v.erros.join('; ') };
    return { ok: true, obj };
  } catch (err) {
    return { ok: false, motivo: 'JSON ilegível: ' + err.message };
  }
}

// ---------- Carga com recuperação automática de backup (L4) ----------
// Tenta o arquivo principal; se corrompido/inválido, tenta o backup.
// Retorna { dados, origem: 'principal'|'backup'|null, aviso }.
function carregarComRecuperacao({ principal, backup, normalizar }) {
  const principalOk = arquivoEhValido(principal);
  if (principalOk.ok) {
    return { dados: normalizar(principalOk.obj), origem: 'principal', aviso: null };
  }
  // Principal corrompido/inválido: tenta o backup.
  let aviso = 'Arquivo principal inválido (' + principalOk.motivo + ').';
  const backupOk = arquivoEhValido(backup);
  if (backupOk.ok) {
    return { dados: normalizar(backupOk.obj), origem: 'backup', aviso };
  }
  return {
    dados: null,
    origem: null,
    aviso: aviso + ' Backup também inválido (' + (backupOk.motivo || 'sem backup') + ').'
  };
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  SCHEMA,
  migrarSchema,
  definirSchemaVersion,
  validarEstrutura,
  arquivoEhValido,
  carregarComRecuperacao
};
