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
        } catch (_) { /* ignora */ }
      }
    }
  } catch (_) { /* pasta inexistente: ignora */ }
  return removidos;
}

module.exports = { salvarArquivoAtomico, limparTemporarios };
