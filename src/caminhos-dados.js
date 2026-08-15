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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolverCaminhoDados };
}
