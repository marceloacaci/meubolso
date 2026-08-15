// Decide o diretório de dados conforme o ambiente de execução.
// Separa os 3 ambientes para NÃO misturar entradas:
//   dev       -> userData/                         (ex.: %APPDATA%/meubolso/)
//   portatil  -> pasta do próprio executável       (leva o .exe e os dados juntos)
//   instalado -> userData/<versao>/                 (isolado por versão do release)
// Função pura e testável (sem dependências do Electron).
function resolverCaminhoDados({ isPackaged, portableDir, userData, versao }) {
  if (!isPackaged) {
    return { ambiente: 'dev', base: userData };
  }
  if (portableDir) {
    return { ambiente: 'portatil', base: portableDir };
  }
  return { ambiente: 'instalado', base: require('path').join(userData, versao || '0.0.0') };
}

// Plano de migração de dados entre versões (ambiente instalado).
// O instalado isola os dados por versão do release (%APPDATA%/meubolso/<versao>/).
// Ao atualizar, os dados da versão antiga devem ir para a nova — sem perda.
//
// Recebe:
//   versaoAtual: versão em execução (ex.: '2.0.0-rc')
//   versoes: [{ nome, temDados }]  (subpastas de %APPDATA%/meubolso)
// Retorna:
//   { origem, copiado, limpar: [nomes] }
//   - origem: versão de onde copiar os dados (ou null se nada a copiar)
//   - copiado: true se devemos copiar (a atual está vazia e há origem com dados)
//   - limpar: subpastas que podem ser removidas (nunca a atual nem a origem)
// Função pura e testável (sem acesso a FS).
function planejarMigracao({ versaoAtual, versoes }) {
  const atual = versoes.find(v => v.nome === versaoAtual);
  if (atual && atual.temDados) {
    // Já tem dados na versão atual: mantém e agenda limpeza das demais.
    return {
      origem: null,
      copiado: false,
      limpar: versoes.filter(v => v.nome !== versaoAtual).map(v => v.nome),
    };
  }
  // Busca a versão com dados mais recente (ordem desc de nome) para ser a fonte.
  const comDados = versoes
    .filter(v => v.temDados && v.nome !== versaoAtual)
    .sort((a, b) => b.nome.localeCompare(a.nome));
  const origem = comDados.length ? comDados[0].nome : null;
  const limpar = versoes
    .filter(v => v.nome !== versaoAtual && v.nome !== origem)
    .map(v => v.nome);
  return { origem, copiado: !!origem, limpar };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolverCaminhoDados, planejarMigracao, executarMigracaoFS };
}

// Executa a migração em disco (cópia + limpeza) com base no plano.
// Função pura e testável: recebe fs/path injetados e não depende do Electron.
// base: pasta base (%APPDATA%/meubolso); versaoAtual: versão em execução.
// Retorna { copiado, origem, removidos: [nomes] }.
function executarMigracaoFS({ base, versaoAtual, fs, path }) {
  if (!fs.existsSync(base)) return { copiado: false, origem: null, removidos: [] };
  const subpastas = fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  const versoes = subpastas.map(nome => ({
    nome,
    temDados: fs.existsSync(path.join(base, nome, 'meubolso.json')),
  }));
  const { origem, copiado, limpar } = planejarMigracao({ versaoAtual, versoes });
  if (copiado && origem) {
    const de = path.join(base, origem);
    const para = path.join(base, versaoAtual);
    for (const item of ['meubolso.json', 'dados.json', 'dados.bak.json', 'pontos.bak.json', 'backups']) {
      const src = path.join(de, item);
      const dst = path.join(para, item);
      if (!fs.existsSync(src)) continue;
      if (fs.statSync(src).isDirectory()) {
        copiarDir(src, dst, fs, path);
      } else {
        fs.mkdirSync(para, { recursive: true });
        fs.copyFileSync(src, dst);
      }
    }
  }
  const removidos = [];
  for (const nome of limpar) {
    const dir = path.join(base, nome);
    try {
      // Proteção: nunca remove pasta que ainda tenha meubolso.json.
      if (!fs.existsSync(path.join(dir, 'meubolso.json'))) {
        fs.rmSync(dir, { recursive: true, force: true });
        removidos.push(nome);
      }
    } catch (_) { /* ignora falha de limpeza (não crítica) */ }
  }
  return { copiado, origem, removidos };
}

// Cópia recursiva (fs/path injetados para testabilidade).
function copiarDir(src, dst, fs, path) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copiarDir(s, d, fs, path);
    else fs.copyFileSync(s, d);
  }
}
