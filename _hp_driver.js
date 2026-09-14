// Verifica hoverOffset sustentado usando window.__hp (sem caçar chart._plugins).
const { app, BrowserWindow } = require('electron');
const path = require('path');
let win;
function finish(code) { try { if (win) win.close(); } catch (_) {} setTimeout(() => { try { app.exit(code); } catch (_) { process.exit(code); } }, 50); }

app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 900, height: 700, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await win.loadFile(path.join(__dirname, '_hp.html'));
  await new Promise((r) => setTimeout(r, 1800));

  const antes = await win.webContents.executeJavaScript(`
    (function(){
      var chart = window.__chart;
      var el = chart.getDatasetMeta(0).data[0];
      var a = (el.startAngle + el.endAngle)/2;
      var midR = (el.innerRadius + el.outerRadius)/2;
      var px = el.x + Math.cos(a)*midR;
      var py = el.y + Math.sin(a)*midR;
      var cv = chart.canvas, rect = cv.getBoundingClientRect();
      var vx = rect.left + (px/chart.width)*rect.width;
      var vy = rect.top + (py/chart.height)*rect.height;
      window.__outerAntes = el.outerRadius;
      chart._hoverIdx = -1;
      chart.setActiveElements([]);
      window.__hp.afterEvent(chart, { event:{type:'mousemove',x:0,y:0,native:{clientX:vx,clientY:vy}}, replay:false, changed:false, inChartArea:true });
      return JSON.stringify({ outerAntes: window.__outerAntes, activeImediato: chart.getActiveElements().map(function(e){return e.index;}) });
    })()
  `);

  await new Promise((r) => setTimeout(r, 700));

  const depois = await win.webContents.executeJavaScript(`
    (function(){
      var chart = window.__chart;
      var el = chart.getDatasetMeta(0).data[0];
      return JSON.stringify({ outerDepois: el.outerRadius, active: chart.getActiveElements().map(function(e){return e.index;}) });
    })()
  `);

  const a = JSON.parse(antes);
  const d = JSON.parse(depois);
  console.log('RESULT__' + JSON.stringify({
    outerAntes: a.outerAntes,
    outerDepois: d.outerDepois,
    activeDepois: d.active,
    hoverOffsetSustentado: d.outerDepois > a.outerAntes,
  }, null, 2));
  finish(0);
});
setTimeout(() => { console.log('TIMEOUT__'); finish(2); }, 15000);