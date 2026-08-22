// Índice de internacionalização (S3-1). UMD: <script> clássico OU CommonJS.
var pt = typeof pt !== 'undefined' ? pt : require('./pt.js');
var en = typeof en !== 'undefined' ? en : require('./en.js');
var es = typeof es !== 'undefined' ? es : require('./es.js');

var I18N = { pt: pt, en: en, es: es };
if (typeof window !== 'undefined') window.I18N = I18N;

if (typeof module !== 'undefined' && module.exports) module.exports = I18N;
