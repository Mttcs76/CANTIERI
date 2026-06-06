// MODULO PRESENZE — Gestione giornaliera per ufficio paghe
// ════════════════════════════════════════════

const TIPI_PRESENZA = {
  ordinario:   { label: 'Ordinario',    ic: '✅', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  straordinario:{ label: 'Straord.',   ic: '⏱️', color: '#0369a1', bg: '#eff6ff', border: '#bfdbfe' },
  ferie:       { label: 'Ferie',        ic: '🏖️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  malattia:    { label: 'Malattia',     ic: '🏥', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  permesso:    { label: 'Permesso',     ic: '📋', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  assente:     { label: 'Assente',      ic: '❌', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

function getPresenzeGiorno(data) {
  if (!S.presenze) S.presenze = {};
  if (!S.presenze[data]) S.presenze[data] = {};
  return S.presenze[data];
}

function setPresenza(opId, data, tipo, ore, note) {
  if (!S.presenze) S.presenze = {};
  if (!S.presenze[data]) S.presenze[data] = {};
  if (tipo === 'assente') {
    S.presenze[data][opId] = { tipo, ore: 0, note: note||'' };
  } else {
    S.presenze[data][opId] = { tipo, ore: +ore||0, note: note||'' };
  }
  save();
  renderPresenzeGiorno();
  aggiornaBadgePresenze(data);
}

function aggiornaBadgePresenze(data) {
  const badge = document.getElementById('presenze-today-badge');
  if (!badge) return;
  const oggi = new Date().toISOString().slice(0,10);
  const pres = getPresenzeGiorno(data);
  const tot = Object.keys(pres).length;
  const totOp = (S.operaiGlobali||[]).length;
  if (data === oggi) {
    badge.textContent = tot > 0 ? `${tot}/${totOp} oggi` : 'oggi';
    badge.style.background = tot === totOp && totOp > 0 ? '#dcfce7' : '#fff8e1';
    badge.style.color = tot === totOp && totOp > 0 ? '#15803d' : '#b45309';
  } else {
    badge.textContent = 'oggi';
  }
}

function presenzeGiornoPrec() {
  const inp = document.getElementById('presenzeData');
  if (!inp) return;
  const d = new Date(inp.value || new Date().toISOString().slice(0,10));
  d.setDate(d.getDate() - 1);
  inp.value = d.toISOString().slice(0,10);
  renderPresenzeGiorno();
}

function presenzeGiornoSucc() {
  const inp = document.getElementById('presenzeData');
  if (!inp) return;
  const d = new Date(inp.value || new Date().toISOString().slice(0,10));
  d.setDate(d.getDate() + 1);
  inp.value = d.toISOString().slice(0,10);
  renderPresenzeGiorno();
}

function renderPresenzeGiorno() {
  const inp = document.getElementById('presenzeData');
  const list = document.getElementById('presenzeList');
  if (!inp || !list) return;
  const data = inp.value;
  if (!data) return;
  // Aggiorna display data leggibile
  const display = document.getElementById('prezDateDisplay');
  if (display) {
    const d = new Date(data + 'T12:00:00');
    const oggi = new Date().toISOString().slice(0,10);
    const ieri = new Date(Date.now()-86400000).toISOString().slice(0,10);
    const label = data === oggi ? 'Oggi' : data === ieri ? 'Ieri' : '';
    const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
    const mesi = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    display.textContent = (label ? label + ' · ' : '') + giorni[d.getDay()] + ' ' + d.getDate() + ' ' + mesi[d.getMonth()] + ' ' + d.getFullYear();
  }
  const operai = S.operaiGlobali || [];
  const pres = getPresenzeGiorno(data);

  if (!operai.length) {
    const isConnected = window._fbEnabled;
    list.innerHTML = isConnected
      ? '<div style="text-align:center;padding:16px;font-size:13px;color:var(--soft)">⏳ Caricamento operai...</div>'
      : '<div style="text-align:center;padding:16px;font-size:13px;color:var(--soft)">Nessun operaio in anagrafica.<br>Aggiungili dalla sezione Operai.</div>';
    return;
  }

  list.innerHTML = operai.map(op => {
    const p = pres[op.id] || null;
    const tipo = p ? p.tipo : null;
    const ore = p ? p.ore : 0;
    const tipiBtns = Object.entries(TIPI_PRESENZA).map(([k, t]) =>
      `<button onclick="presenzaSetTipo('${op.id}','${data}','${k}')"
        style="padding:4px 6px;border-radius:6px;font-size:9px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;border:1.5px solid ${tipo===k ? t.color : t.border};background:${tipo===k ? t.bg : '#fff'};color:${tipo===k ? t.color : '#888'};white-space:nowrap">
        ${t.ic} ${t.label}
      </button>`
    ).join('');

    const oreInput = tipo && tipo !== 'assente' && tipo !== 'ferie' && tipo !== 'malattia'
      ? `<div style="display:flex;align-items:center;gap:6px;margin-top:6px">
          <span style="font-size:11px;color:var(--soft);font-weight:600">Ore:</span>
          <input type="number" min="0" max="24" step="0.5" value="${ore||op.oreDay||8}"
            onchange="presenzaSetOre('${op.id}','${data}',this.value)"
            style="width:56px;border:1px solid var(--s2);border-radius:6px;padding:4px 6px;font-size:13px;font-family:'Nunito',sans-serif;text-align:center">
          <span style="font-size:11px;color:var(--soft)">h</span>
        </div>`
      : '';

    const statoColor = tipo ? TIPI_PRESENZA[tipo].color : '#ccc';
    const statoLabel = tipo ? `${TIPI_PRESENZA[tipo].ic} ${tipo === 'ordinario' ? ore+'h' : TIPI_PRESENZA[tipo].label}` : '—';

    return `<div style="background:var(--s1);border-radius:10px;padding:10px 12px;margin-bottom:8px;border:1.5px solid ${tipo ? TIPI_PRESENZA[tipo].border : 'var(--s2)'}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">${esc(op.nome)}</div>
          <div style="font-size:10px;color:var(--soft)">${esc(op.qualifica||'')} · €${op.costo}/h</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${statoColor}">${statoLabel}</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${tipiBtns}</div>
      ${oreInput}
    </div>`;
  }).join('');

  aggiornaBadgePresenze(data);
}

function presenzaSetTipo(opId, data, tipo) {
  const op = (S.operaiGlobali||[]).find(o => o.id === opId);
  const oreDefault = op ? (op.oreDay || 8) : 8;
  const oreAttuali = S.presenze && S.presenze[data] && S.presenze[data][opId]
    ? S.presenze[data][opId].ore : oreDefault;
  setPresenza(opId, data, tipo, tipo === 'assente' || tipo === 'ferie' || tipo === 'malattia' ? 0 : oreAttuali, '');
}

function presenzaSetOre(opId, data, ore) {
  if (!S.presenze || !S.presenze[data] || !S.presenze[data][opId]) return;
  S.presenze[data][opId].ore = +ore || 0;
  save();
}

function initPresenzeUI() {
  const inp = document.getElementById('presenzeData');
  if (inp && !inp.value) {
    inp.value = new Date().toISOString().slice(0,10);
  }
  renderPresenzeGiorno();
  // Se operai non ancora caricati da Firebase, riprova
  if (!(S.operaiGlobali && S.operaiGlobali.length)) {
    setTimeout(renderPresenzeGiorno, 800);
    setTimeout(renderPresenzeGiorno, 2000);
  }
}

function exportPresenzeCSV() {
  if (!S.presenze || !Object.keys(S.presenze).length) {
    toast('⚠️ Nessuna presenza da esportare'); return;
  }
  const mese = prompt('Mese da esportare (YYYY-MM, es. 2026-06):', new Date().toISOString().slice(0,7));
  if (!mese || !mese.match(/^\d{4}-\d{2}$/)) { toast('Formato mese non valido'); return; }

  const operai = S.operaiGlobali || [];
  const rows = [['Matricola/Nome','Qualifica','Data','Tipo presenza','Ore','Note','Costo €']];

  const giorni = Object.keys(S.presenze)
    .filter(d => d.startsWith(mese))
    .sort();

  if (!giorni.length) { toast('Nessuna presenza nel mese ' + mese); return; }

  operai.forEach(op => {
    giorni.forEach(data => {
      const p = S.presenze[data] && S.presenze[data][op.id];
      if (!p) return;
      const costo = p.tipo !== 'assente' && p.tipo !== 'ferie' && p.tipo !== 'malattia'
        ? ((+p.ore||0) * (+op.costo||0)).toFixed(2) : '0.00';
      rows.push([
        op.nome,
        op.qualifica || '',
        data,
        TIPI_PRESENZA[p.tipo] ? TIPI_PRESENZA[p.tipo].label : p.tipo,
        p.ore || 0,
        p.note || '',
        costo
      ]);
    });
  });

  rows.push([]);
  rows.push(['RIEPILOGO MENSILE','','','','','','']);
  rows.push(['Nome','Qualifica','Gg ordinarie','Ore ord.','Gg straord.','Ore straord.','Ferie','Malattia','Permessi','Assenze','Costo totale €']);

  operai.forEach(op => {
    let ggOrd=0, oreOrd=0, ggStr=0, oreStr=0, ggFerie=0, ggMal=0, ggPerm=0, ggAss=0, costoTot=0;
    giorni.forEach(data => {
      const p = S.presenze[data] && S.presenze[data][op.id];
      if (!p) return;
      if (p.tipo==='ordinario')    { ggOrd++;  oreOrd  += +p.ore||0; costoTot += (+p.ore||0)*(+op.costo||0); }
      if (p.tipo==='straordinario'){ ggStr++;  oreStr  += +p.ore||0; costoTot += (+p.ore||0)*(+op.costo||0); }
      if (p.tipo==='ferie')        { ggFerie++; }
      if (p.tipo==='malattia')     { ggMal++; }
      if (p.tipo==='permesso')     { ggPerm++; }
      if (p.tipo==='assente')      { ggAss++; }
    });
    rows.push([op.nome, op.qualifica||'', ggOrd, oreOrd, ggStr, oreStr, ggFerie, ggMal, ggPerm, ggAss, costoTot.toFixed(2)]);
  });

  const csv = rows.map(r => r.join(';')).join('
');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,﻿' + encodeURIComponent(csv);
  a.download = 'Presenze_' + mese + '_Tecnobase.csv';
  a.click();
  toast('📊 CSV presenze esportato per ufficio paghe!');
}

function exportPresenzePDF() {
  if (!window.jspdf) { toast('Libreria PDF non disponibile'); return; }
  const mese = prompt('Mese da esportare (YYYY-MM, es. 2026-06):', new Date().toISOString().slice(0,7));
  if (!mese || !mese.match(/^\d{4}-\d{2}$/)) return;

  const operai = S.operaiGlobali || [];
  if (!operai.length) { toast('Nessun operaio in anagrafica'); return; }

  const giorni = S.presenze
    ? Object.keys(S.presenze).filter(d => d.startsWith(mese)).sort()
    : [];

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, M = 10;
  let y = 18;

  doc.setFillColor(26,74,46);
  doc.rect(M, M, W-M*2, 10, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont(undefined,'bold');
  doc.text('REGISTRO PRESENZE — Tecnobase Restauri Srl — ' + mese, W/2, 16.5, {align:'center'});
  doc.setTextColor(0,0,0); y = 26;

  operai.forEach(op => {
    if (y > 175) { doc.addPage(); y = 18; }

    doc.setFillColor(232,240,232);
    doc.rect(M, y-3, W-M*2, 7, 'F');
    doc.setFontSize(9); doc.setFont(undefined,'bold');
    doc.text(`${op.nome}  —  ${op.qualifica||''}  —  €${op.costo}/h`, M+2, y+1);

    let oreOrd=0, oreStr=0, ggFerie=0, ggMal=0, ggPerm=0, ggAss=0;
    giorni.forEach(data => {
      const p = S.presenze[data] && S.presenze[data][op.id];
      if (!p) return;
      if (p.tipo==='ordinario')     oreOrd += +p.ore||0;
      if (p.tipo==='straordinario') oreStr += +p.ore||0;
      if (p.tipo==='ferie')         ggFerie++;
      if (p.tipo==='malattia')      ggMal++;
      if (p.tipo==='permesso')      ggPerm++;
      if (p.tipo==='assente')       ggAss++;
    });
    const costoTot = (oreOrd + oreStr) * (+op.costo||0);
    doc.setFont(undefined,'normal'); doc.setFontSize(8);
    doc.text(`Ord: ${oreOrd}h  Straord: ${oreStr}h  Ferie: ${ggFerie}gg  Mal: ${ggMal}gg  Perm: ${ggPerm}gg  Ass: ${ggAss}gg  Costo: €${costoTot.toFixed(2)}`, W-M-2, y+1, {align:'right'});
    y += 9;

    const presGiorno = giorni.filter(d => S.presenze[d] && S.presenze[d][op.id]);
    if (presGiorno.length) {
      presGiorno.forEach(data => {
        if (y > 190) { doc.addPage(); y = 18; }
        const p = S.presenze[data][op.id];
        const tp = TIPI_PRESENZA[p.tipo] || {label: p.tipo};
        doc.text(data, M+4, y);
        doc.text(tp.label, M+30, y);
        doc.text(p.ore > 0 ? p.ore+'h' : '—', M+70, y);
        if (p.note) doc.text(p.note.slice(0,60), M+85, y);
        y += 4.5;
      });
    } else {
      doc.setTextColor(150,150,150);
      doc.text('Nessuna presenza registrata nel mese', M+4, y);
      doc.setTextColor(0,0,0);
      y += 5;
    }
    y += 4;
  });

  doc.save('Presenze_' + mese + '_Tecnobase.pdf');
  toast('📄 PDF presenze generato!');
}
