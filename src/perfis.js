// Gerenciamento de múltiplos perfis de dados (S6-4).
// Cada perfil tem seu próprio arquivo criptografado/aberto em perfis/perfil-<id>.json
// e suas próprias configurações (idioma, tema, acento, moeda, criptografia).
// Um índice perfis.json (não criptografado) guarda a lista e qual está ativo.
// Funções puras e testáveis (sem dependências do Electron).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Gera um id estável a partir do nome (slug) — usado no nome do arquivo.
function slugify(nome) {
  return (
    String(nome || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'perfil'
  );
}

// Caminho do arquivo de um perfil dentro da pasta de dados.
function caminhoPerfil(base, id) {
  return path.join(base, 'perfis', `perfil-${id}.json`);
}

// Lê o índice de perfis (ou cria vazio).
function lerIndice(base) {
  const arquivo = path.join(base, 'perfis.json');
  if (!fs.existsSync(arquivo)) return { ativo: null, perfis: [] };
  try {
    const j = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (!j || !Array.isArray(j.perfis)) return { ativo: null, perfis: [] };
    return j;
  } catch (_) {
    return { ativo: null, perfis: [] };
  }
}

// Salva o índice de perfis.
function salvarIndice(base, indice) {
  const arquivo = path.join(base, 'perfis.json');
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, JSON.stringify(indice, null, 2));
}

// Cria um novo perfil (sem dados ainda). Retorna { ok, id?, erro? }.
function criarPerfil(base, nome) {
  nome = (nome || '').trim();
  if (!nome) return { ok: false, erro: 'nome vazio' };
  const indice = lerIndice(base);
  if (indice.perfis.some((p) => p.nome.toLowerCase() === nome.toLowerCase())) {
    return { ok: false, erro: 'nome duplicado' };
  }
  let id = slugify(nome);
  // Garante unicidade do id (nomes diferentes podem colidir no slug).
  const ids = new Set(indice.perfis.map((p) => p.id));
  if (ids.has(id)) {
    id = `${id}-${crypto.randomBytes(3).toString('hex')}`;
  }
  const perfil = { id, nome, cripto: false };
  indice.perfis.push(perfil);
  if (!indice.ativo) indice.ativo = id;
  salvarIndice(base, indice);
  // Cria o arquivo de dados vazio do perfil.
  const arq = caminhoPerfil(base, id);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  if (!fs.existsSync(arq)) {
    fs.writeFileSync(
      arq,
      JSON.stringify(
        {
          dividas: [],
          pagamentos: [],
          carteiras: [],
          recorrentes: [],
          metas: [],
          lixeira: { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] },
          configuracoes: { moeda: 'BRL' },
          gamificacao: { xp: 0, nivel: 1, historico: [] },
        },
        null,
        2
      )
    );
  }
  return { ok: true, id, perfil };
}

// Define o perfil ativo.
function definirAtivo(base, id) {
  const indice = lerIndice(base);
  if (!indice.perfis.some((p) => p.id === id)) return { ok: false, erro: 'perfil inexistente' };
  indice.ativo = id;
  salvarIndice(base, indice);
  return { ok: true };
}

// Renomeia um perfil (exige senha atual se criptografado — validada pelo chamador).
function renomearPerfil(base, id, novoNome) {
  novoNome = (novoNome || '').trim();
  if (!novoNome) return { ok: false, erro: 'nome vazio' };
  const indice = lerIndice(base);
  const p = indice.perfis.find((x) => x.id === id);
  if (!p) return { ok: false, erro: 'perfil inexistente' };
  if (indice.perfis.some((x) => x.id !== id && x.nome.toLowerCase() === novoNome.toLowerCase())) {
    return { ok: false, erro: 'nome duplicado' };
  }
  p.nome = novoNome;
  salvarIndice(base, indice);
  return { ok: true };
}

// Marca se o perfil está criptografado (após ativar).
function marcarCripto(base, id, ativa) {
  const indice = lerIndice(base);
  const p = indice.perfis.find((x) => x.id === id);
  if (!p) return { ok: false, erro: 'perfil inexistente' };
  p.cripto = !!ativa;
  salvarIndice(base, indice);
  return { ok: true };
}

// Remove um perfil (e seu arquivo de dados).
function removerPerfil(base, id) {
  const indice = lerIndice(base);
  indice.perfis = indice.perfis.filter((x) => x.id !== id);
  if (indice.ativo === id) indice.ativo = indice.perfis.length ? indice.perfis[0].id : null;
  salvarIndice(base, indice);
  const arq = caminhoPerfil(base, id);
  try {
    if (fs.existsSync(arq)) fs.unlinkSync(arq);
  } catch (_) {}
  return { ok: true, ativo: indice.ativo };
}

// Migra o meubolso.json legado (se existir e não houver perfis) para o primeiro perfil.
function migrarLegado(base, nomePadrao) {
  const indice = lerIndice(base);
  if (indice.perfis.length) return { ok: true, migrou: false };
  const legado = path.join(base, 'meubolso.json');
  const nome = (nomePadrao || 'Marcelo').trim() || 'Marcelo';
  const r = criarPerfil(base, nome);
  if (!r.ok) return { ok: false, erro: r.erro };
  if (fs.existsSync(legado)) {
    const dest = caminhoPerfil(base, r.id);
    try {
      fs.copyFileSync(legado, dest);
    } catch (_) {}
    // Não apaga o legado imediatamente para segurança; o app decide.
  }
  return { ok: true, migrou: true, id: r.id, nome };
}

module.exports = {
  slugify,
  caminhoPerfil,
  lerIndice,
  salvarIndice,
  criarPerfil,
  definirAtivo,
  renomearPerfil,
  marcarCripto,
  removerPerfil,
  migrarLegado,
};
