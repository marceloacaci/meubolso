/* MeuBolso — biblioteca central de ícones SVG (sem dependências).
 *
 * Todos os ícones seguem o mesmo estilo "linha minimalista" do ícone de
 * carteira (index.html): viewBox 24x24, stroke="currentColor",
 * stroke-width 1.7, preenchimento nulo, cantos arredondados. Eles herdam
 * a cor do texto (currentColor) e se adaptam ao tema claro/escuro.
 *
 * Uso: ICON.nome  -> string SVG pronta para innerHTML / template literal.
 *      ICON.svg('nome', 'classe-extra') -> SVG com classe adicional.
 *
 * Mantido em arquivo próprio (sem bundler) para o app Electron offline.
 */
(function () {
  'use strict';

  // Atalho para montar um SVG de contorno (linha) consistente.
  function line(paths, extra) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" class="ico-svg' + (extra ? ' ' + extra : '') + '">' +
      paths + '</svg>'
    );
  }

  const ICONS = {
    // --- Marca / logo ---
    moeda: line('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.5v9"/><path d="M9.5 9.6c0-1 1.1-1.6 2.5-1.6s2.5.6 2.5 1.6-1.1 1.4-2.5 1.4-2.5.6-2.5 1.6 1.1 1.6 2.5 1.6 2.5-.6 2.5-1.6"/>'),

    // --- Navegação (sidebar) ---
    painel: line('<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>'),
    dividas: line('<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5V8h4.5"/><path d="M9 12.5h6M9 15.5h6"/>'),
    pagamentos: line('<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>'),
    vencimentos: line('<rect x="3.5" y="4.8" width="17" height="16" rx="2.2"/><path d="M3.5 9h17"/><path d="M8 2.8v3.6M16 2.8v3.6"/><path d="M12 12.5v4l2.4 1.4"/>'),
    relatorio: line('<path d="M4 19.5V5a1 1 0 0 1 1-1h11l3 3v12.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"/><path d="M8 14l2.5-3 2 2.2L16 10l2 2.5"/><path d="M8 18h8"/>'),
    config: line('<circle cx="12" cy="12" r="3.1"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),
    sobre: line('<circle cx="12" cy="12" r="8.4"/><path d="M9.8 9.4a2.2 2.2 0 0 1 4.2.8c0 1.5-2.2 1.8-2.2 3.3"/><circle cx="12" cy="16.6" r=".5" fill="currentColor" stroke="none"/>'),

    // --- Carteira (mesmo desenho do index.html) ---
    carteira: line('<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h13a1.5 1.5 0 0 1 1.5 1.5V9"/><path d="M3 8.5V17a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 19 17v-6"/><path d="M4.5 7C4.5 5.6 5.6 4.5 7 4.5h6c1.4 0 2.2.6 3 1.6.8 1 1.6 1.4 2.5 1.4H17"/><circle cx="15.6" cy="13.5" r="0.9" fill="currentColor" stroke="none"/>'),

    // --- Ações / CTA ---
    mais: line('<path d="M12 5v14M5 12h14"/>'),
    exportar: line('<path d="M12 3.5v10"/><path d="M8.5 7.5 12 3.5l3.5 4"/><path d="M4.5 14.5v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5"/>'),
    importar: line('<path d="M12 14.5V4.5"/><path d="M8.5 10.5 12 14.5l3.5-4"/><path d="M4.5 14.5v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5"/>'),
    restaurar: line('<path d="M4 11a8 8 0 1 1 1.6 4.8"/><path d="M4 7v4.5h4.5"/>'),
    editar: line('<path d="M14.5 4.5l5 5"/><path d="M5 19h4l9.5-9.5a2 2 0 0 0-2.8-2.8L6.2 16.2A2 2 0 0 0 5 17.8Z"/>'),
    lixeira: line('<path d="M4.5 6.5h15"/><path d="M9 6.5V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-13"/>'),

    // --- Insights / status ---
    vazio: line('<path d="M5 8.5 12 4l7 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5Z"/><path d="M5 8.5h14"/><path d="M9.5 12h5"/>'),
    festa: line('<path d="M7 11l2.2 2.2M17 11l-2.2 2.2M12 9.5l2.5 2.5M12 9.5 9.5 12"/><path d="M3.5 19h17"/><path d="M5.5 19c0-3 1.6-5 2.8-5 .9 0 1.2 1 1.2 1.8 0-1 .5-1.8 1.5-1.8s1.5.8 1.5 1.8c0-1 .5-1.8 1.5-1.8s2.8 2 2.8 5"/>'),
    forca: line('<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 11V5.2a1.5 1.5 0 0 1 3 0V11"/><path d="M14 11V6.8a1.5 1.5 0 0 1 3 0V12a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-5.3-3.2l-1.3-2.3a1.4 1.4 0 0 1 2.3-1.5L8 13"/>'),
    ampulheta: line('<path d="M6.5 4.5h11"/><path d="M6.5 19.5h11"/><path d="M7 4.5c0 4.2 3 6 5 7 2-1 5-2.8 5-7"/><path d="M7 19.5c0-4.2 3-6 5-7 2 1 5 2.8 5 7"/>'),
    alerta: line('<path d="M12 3.5 21 19H3L12 3.5Z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="16.6" r=".5" fill="currentColor" stroke="none"/>'),
    info: line('<circle cx="12" cy="12" r="8.4"/><path d="M12 11v5"/><circle cx="12" cy="8.2" r=".5" fill="currentColor" stroke="none"/>'),
    marcador: line('<path d="M12 21s6.5-5.2 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.8 12 21 12 21Z"/><circle cx="12" cy="10.4" r="2.3"/>'),
    cartao: line('<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>'),
    acordo: line('<path d="M8 12.5l2.6 2.6L16.5 8"/><circle cx="12" cy="12" r="8.4"/>'),
    quebra: line('<path d="M5 6.5 8 9l-3 3 3.5 3.5"/><path d="M10.5 13h7"/><path d="M14 9.5l3.5 3.5L14 16.5"/>'),
    caixa: line('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>'),
    pasta: line('<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h3.2l1.6 2h7.2A1.5 1.5 0 0 1 19 8.5v8A1.5 1.5 0 0 1 17.5 18h-13A1.5 1.5 0 0 1 3 16.5V6.5"/><path d="M4 8.5h16"/>'),
    chegada: line('<path d="M5 20h14"/><path d="M6 14V9a4 4 0 0 1 8 0M8 9V5a3 3 0 0 1 6 0v4"/><path d="M14 11l3.5-3.5L14 4"/>'),

    // --- Gamificação / nível ---
    trofeu: line('<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5.5H4.5V7A2.5 2.5 0 0 0 7 9.5"/><path d="M17 5.5h2.5V7A2.5 2.5 0 0 1 17 9.5"/><path d="M12 13v3"/><path d="M8.5 20h7l-1-4h-5l-1 4Z"/>'),
    raio: line('<path d="M13 2.5 4.5 13H11l-1.5 8.5L19.5 11H13l0-8.5Z"/>'),
    check: line('<path d="M5 12.5 10 17.5 19 6.5"/>'),
    setaDireita: line('<path d="M4.5 12h14"/><path d="M13 6.5 18.5 12 13 17.5"/>'),
    setaCima: line('<path d="M12 19V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/>'),
    setaBaixo: line('<path d="M12 5v14"/><path d="M6.5 13.5 12 19l5.5-5.5"/>'),
    reciclar: line('<path d="M6.5 8.5 9 6l-1-1.8A1.6 1.6 0 0 1 10 2.6L13 5l-3 3-1.8-1.8"/><path d="M17.5 15.5 15 18l1 1.8a1.6 1.6 0 0 1-2 2.6L10 19l3-3 1.8 1.8"/><path d="M19.4 12.5a7 7 0 0 1-13 1.2"/><path d="M4.6 11.5a7 7 0 0 1 13-1.2"/>'),
    estrela: line('<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8Z"/>'),
    sino: line('<path d="M6 18h12"/><path d="M12 3.5a5 5 0 0 1 5 5v4l1.5 2.5H5.5L7 12.5V8.5a5 5 0 0 1 5-5Z"/><path d="M10 18.5a2 2 0 0 0 4 0"/>'),
    porta: line('<path d="M6 21V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v18"/><path d="M6 21h10"/><circle cx="14" cy="12" r=".8" fill="currentColor" stroke="none"/>'),
    documento: line('<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5V8h4.5"/><path d="M9 12.5h6M9 15.5h6"/>'),

    // --- Sobre / tech ---
    globo: line('<circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8"/><path d="M12 3.6c2.5 2.2 4 5.2 4 8.4s-1.5 6.2-4 8.4c-2.5-2.2-4-5.2-4-8.4s1.5-6.2 4-8.4Z"/>'),
    quadradoAmarelo: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-svg"><rect x="4" y="4" width="16" height="16" rx="3" fill="#facc15"/></svg>',
    quadradoVerde: '<svg viewBox="0 0 24 24" aria-hidden="true" class="ico-svg"><rect x="4" y="4" width="16" height="16" rx="3" fill="#22c55e"/></svg>',
    pincel: line('<path d="M4 20c0-2 1-3 3-3l9-9 1.5 1.5-9 9c0 2-1 3-3 3-.4 0-.6-.2-.5-.5Z"/><path d="M14 6.5 17.5 10"/>'),
    cadeado: line('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15" r="1" fill="currentColor" stroke="none"/>'),
    lampada: line('<path d="M9 17h6"/><path d="M10 20h4"/><path d="M12 3.5a5.5 5.5 0 0 0-3.5 9.7c.7.6 1 1.3 1 2.3h5c0-1 .3-1.7 1-2.3A5.5 5.5 0 0 0 12 3.5Z"/>'),
    ferramenta: line('<path d="M14.5 6.5a3.5 3.5 0 0 0-4.7 4.3L4.5 16l3 3 5.2-5.3a3.5 3.5 0 0 0 4.3-4.7l-2.6 2.6-2.2-2.2 2.6-2.6Z"/>'),
    monitor: line('<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 20.5h6"/><path d="M12 16.5v4"/>'),
    pessoa: line('<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>'),
    github: line('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>'),
    // --- Logos de tecnologia (linha minimalista, currentColor) ---
    nodejs: line('<path d="M12 2.5 20 7 20 17 12 21.5 4 17 4 7 Z"/><path d="M8.6 15.4V8.6L15.4 15.4V8.6"/>'),
    javascript: line('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9 8.5V13a2.5 2.5 0 0 0 5 0"/><path d="M11 11.4h2"/><path d="M15.6 8.5h-2.6a1.4 1.4 0 0 0 0 2.8h2.6a1.4 1.4 0 0 1 0 2.8h-2.6"/>'),
    bootstrap: line('<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><path d="M9 8h3.2a1.5 1.5 0 0 1 0 3H9zM9 11h3.4a1.5 1.5 0 0 1 0 3H9z"/><path d="M9 8v9"/>'),
    dinheiro: line('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.5v9"/><path d="M9.5 9.6c0-1 1.1-1.6 2.5-1.6s2.5.6 2.5 1.6-1.1 1.4-2.5 1.4-2.5.6-2.5 1.6 1.1 1.6 2.5 1.6 2.5-.6 2.5-1.6"/>'),

    // --- Engrenagem flutuante ---
    engrenagem: line('<circle cx="12" cy="12" r="3.1"/><path d="M19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),

    // --- Sol / lua (tema) ---
    sol: line('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19"/>'),
    lua: line('<path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5Z"/>'),

    // --- Relógio (Brasília) ---
    relogio: line('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5V12l3 1.8"/>'),

    // --- Bandeiras (SVG simplificado) ---
    // Bandeiras em estilo "contorno minimalista" (currentColor), sem cores —
    // consistentes com os demais ícones do sistema (herdam a cor do texto e
    // se adaptam ao tema claro/escuro). O contorno traça o formato da bandeira
    // com detalhes suficientes para identificá-las (proporções reais).
    br: line('<rect x="3" y="3.5" width="18" height="14" rx="2"/><path d="M12 4.8 19.5 10.5 12 16.2 4.5 10.5Z" fill="none"/><circle cx="12" cy="10.5" r="3.4"/><path d="M8.8 10 Q12 12.6 15.2 10" fill="none"/>'),
    us: line('<rect x="3" y="3.5" width="18" height="14" rx="2"/><line x1="3" y1="6.4" x2="21" y2="6.4"/><line x1="3" y1="9.3" x2="21" y2="9.3"/><line x1="3" y1="12.2" x2="21" y2="12.2"/><line x1="3" y1="15.1" x2="21" y2="15.1"/><rect x="3" y="3.5" width="8.2" height="7.6" rx="1" fill="none"/>'),
    es: line('<rect x="3" y="3.5" width="18" height="14" rx="2"/><line x1="3" y1="8.5" x2="21" y2="8.5"/><line x1="3" y1="12.5" x2="21" y2="12.5"/>'),

    // --- Quests (ícones compostos, distintos e representativos) ---
    // Cadastrar nova dívida: folha de documento com sinal de "+" (novo).
    dividaNova: line('<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5V8h4.5"/><path d="M9 12.5h6M9 15.5h6"/><path d="M17.5 14v5M15 16.5h5"/>'),
    // Editar um pagamento: cédula de dinheiro com lápis pequeno (pagamento + edição).
    editarPagamento: line('<circle cx="12" cy="12" r="8.2"/><path d="M12 7.5v9"/><path d="M9.5 9.6c0-1 1.1-1.6 2.5-1.6s2.5.6 2.5 1.6-1.1 1.4-2.5 1.4-2.5.6-2.5 1.6 1.1 1.6 2.5 1.6 2.5-.6 2.5-1.6"/><path d="M15 4.5 19.5 9 18 10.5 13.5 6Z"/><path d="M14 6l3.5 3.5"/>'),
    // Concluir a gestão de uma dívida: pasta com check (gestão concluída).
    gestao: line('<path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h3.2l1.6 2h7.2A1.5 1.5 0 0 1 19 8.5v8A1.5 1.5 0 0 1 17.5 18h-13A1.5 1.5 0 0 1 3 16.5V6.5"/><path d="M4 8.5h16"/><path d="M14.5 14.5l1.8 1.8 3-3.5"/>'),
    // Editar uma carteira: carteira com lápis pequeno (carteira + edição).
    editarCarteira: line('<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h13a1.5 1.5 0 0 1 1.5 1.5V9"/><path d="M3 8.5V17a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 19 17v-6"/><path d="M4.5 7C4.5 5.6 5.6 4.5 7 4.5h6c1.4 0 2.2.6 3 1.6.8 1 1.6 1.4 2.5 1.4H17"/><circle cx="15.6" cy="13.5" r="0.9" fill="currentColor" stroke="none"/><path d="M15 4.5 19.5 9 18 10.5 13.5 6Z"/><path d="M14 6l3.5 3.5"/>'),
  };

  // Acesso conveniente: ICON.nome ou ICON('nome') ou ICON.svg('nome','classe').
  function ICON(key, extra) {
    if (extra) return line(ICONS[key] ? innerPaths(ICONS[key]) : '', extra);
    return ICONS[key] || '';
  }
  // Extrai só os <path>/<circle>/<rect> de um SVG já montado (para reaproveitar em ICON.svg).
  function innerPaths(svgStr) {
    const m = svgStr.match(/>(.*)<\/svg>/s);
    return m ? m[1] : svgStr;
  }
  ICON.has = function (k) { return Object.prototype.hasOwnProperty.call(ICONS, k); };
  ICON.svg = function (key, extra) { return ICON(key, extra); };
  ICON.svgStr = function (key) { return ICONS[key] || ''; };

  // Expõe cada ícone também como propriedade (ICON.carteira === ICON('carteira')),
  // útil em template literals e facilita a leitura do código.
  for (const k in ICONS) {
    if (!Object.prototype.hasOwnProperty.call(ICON, k)) ICON[k] = ICONS[k];
  }

  window.ICON = ICON;
})();
