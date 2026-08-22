/*
 * Persistência em disco do MeuBolso — funções de escrita segura.
 * Extraído de main.js (S1-5 / Etapa 2) para ser testável em Node (sem Electron).
 */
const fs = require('fs');

// Grava num arquivo temporário e renomeia para o destino final. O `rename` é
// atômico no sistema de arquivos: ou o arquivo antigo ou o novo existe — nunca
// um JSON pela metade. Isso elimina o risco de corrupção se o processo cair
// (queda de energia, kill) durante a escrita (defeito L2 do AS-BUILT).
function salvarArquivoAtomico(caminho, conteudo) {
  const tmp = caminho + '.tmp-' + process.pid + '-' + Date.now();
  fs.writeFileSync(tmp, conteudo, 'utf8');
  fs.renameSync(tmp, caminho); // atômico
}

// Remove arquivos temporários órfãos (de escritas interrompidas) de uma pasta.
// Útil na inicialização, para não deixar lixo de `.tmp-<pid>-<ts>` acumular.
function limparTemporarios(pasta, prefixo) {
  let removidos = 0;
  try {
    const arquivos = fs.readdirSync(pasta);
    for (const nome of arquivos) {
      if (nome.startsWith(prefixo) && nome.includes('.tmp-')) {
        try {
          fs.unlinkSync(require('path').join(pasta, nome));
          removidos++;
        } catch (_) {
          /* ignora */
        }
      }
    }
  } catch (_) {
    /* pasta inexistente: ignora */
  }
  return removidos;
}

// ============================================================
// BACKUP ROTATIVO (S2-5) — N gerações em pasta dedicada
// ============================================================
// Em vez de sobrescrever um único dados.bak.json, cada salvamento empurra uma
// NOVA geração com timestamp em uma pasta `backups/`, mantendo apenas as
// BACKUP_GERACOES mais recentes. Assim, se o usuário perceber tarde demais que
// corrompeu os dados, ainda há até 7 cópias anteriores para restaurar.
const BACKUP_GERACOES = 7;

// Gera o nome de arquivo de uma geração a partir de uma data (YYYYMMDD-HHMMSS).
function nomeGeracao(data) {
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return (
    `meubolso-${data.getFullYear()}${p(data.getMonth() + 1)}${p(data.getDate())}-` +
    `${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}.json`
  );
}

// Copia `origem` para `pasta/meubolso-<timestamp>.json` (escrita atômica: escreve
// .tmp e renomeia) e remove gerações excedentes, mantendo só as mais recentes.
// Parâmetros explícitos (caminho da origem e da pasta) para ser testável em Node
// puro, sem Electron. Retorna o caminho da geração criada ou null em caso de falha.
function fazerBackupRotativo(origem, pasta, agora) {
  agora = agora || new Date();
  if (!fs.existsSync(origem)) return null;
  try {
    const stat = fs.statSync(origem);
    if (stat.size === 0) return null; // não backupa arquivo vazio
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });
    const destino = require('path').join(pasta, nomeGeracao(agora));
    const tmp = destino + '.tmp-' + process.pid + '-' + Date.now();
    fs.copyFileSync(origem, tmp);
    fs.renameSync(tmp, destino); // atômico
    rotacionarBackups(pasta, BACKUP_GERACOES);
    return destino;
  } catch (err) {
    console.warn('[DB] ⚠ Falha ao fazer backup rotativo:', err.message);
    return null;
  }
}

// Mantém apenas as `limite` gerações mais recentes na pasta (remove as demais).
// Ordena por nome de arquivo (timestamp embutido → ordem cronológica) e descarta
// os mais antigos. Não lança: erros são ignorados individualmente.
function rotacionarBackups(pasta, limite) {
  try {
    const arquivos = fs
      .readdirSync(pasta)
      .filter((n) => /^meubolso-\d{8}-\d{6}\.json$/.test(n))
      .sort(); // ordem crescente = mais antigo primeiro
    while (arquivos.length > limite) {
      const antigo = arquivos.shift();
      try {
        fs.unlinkSync(require('path').join(pasta, antigo));
      } catch (_) {}
    }
  } catch (_) {
    /* pasta inexistente: ignora */
  }
}

// Lista as gerações disponíveis (mais recente primeiro) com metadados úteis à
// tela de restauração. `valido` indica se o JSON tem a estrutura mínima esperada
// (dividas/pagamentos como arrays) — assim a UI pode sinalizar backups corrompidos.
function listarBackups(pasta) {
  const lista = [];
  try {
    const arquivos = fs
      .readdirSync(pasta)
      .filter((n) => /^meubolso-\d{8}-\d{6}\.json$/.test(n))
      .sort(); // mais antigo primeiro
    for (const nome of arquivos) {
      const caminho = require('path').join(pasta, nome);
      try {
        const stat = fs.statSync(caminho);
        let valido = false,
          info = {};
        try {
          const d = JSON.parse(fs.readFileSync(caminho, 'utf8'));
          valido = Array.isArray(d.dividas) && Array.isArray(d.pagamentos);
          info = {
            dividas: (d.dividas || []).length,
            pagamentos: (d.pagamentos || []).length,
          };
        } catch (_) {
          /* ilegível: valido=false */
        }
        // Extrai a data do próprio nome do arquivo (sem depender de mtime).
        const m = nome.match(/(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
        const data = m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}` : '';
        lista.push({
          arquivo: nome,
          caminho,
          data,
          modificadoEm: stat.mtime.toISOString(),
          tamanho: stat.size,
          valido,
          info,
        });
      } catch (_) {
        /* pula arquivo problemático */
      }
    }
  } catch (_) {
    /* pasta inexistente: retorna lista vazia */
  }
  return lista.reverse(); // mais recente primeiro
}

// Restaura uma geração específica: copia `origem` (um arquivo de backups/) para
// `destino` (o dbFile) de forma atômica. Retorna true em caso de sucesso.
function restaurarBackup(origem, destino) {
  if (!fs.existsSync(origem)) return false;
  try {
    const tmp = destino + '.tmp-' + process.pid + '-' + Date.now();
    fs.copyFileSync(origem, tmp);
    fs.renameSync(tmp, destino);
    return true;
  } catch (err) {
    console.warn('[DB] ⚠ Falha ao restaurar backup:', err.message);
    return false;
  }
}

module.exports = {
  salvarArquivoAtomico,
  limparTemporarios,
  BACKUP_GERACOES,
  nomeGeracao,
  fazerBackupRotativo,
  rotacionarBackups,
  listarBackups,
  restaurarBackup,
};
