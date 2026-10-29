import { state, firstSel, selectedEls } from '../core/state';
import { getBBoxOf } from '../geometry/bbox';
import { round } from '../utils/math';
import { pushHistory } from '../core/history';
import { renderAll, renderLive } from '../app';
import { translateAttrs, scaleAttrs } from '../geometry/transforms';
import { starPointsStr } from '../tools/create';
import { parsePathData } from '../utils/path';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const setVal = (sel: string, v: any) => {
  const inp = $(sel) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (!inp || document.activeElement === inp) return;
  inp.value = String(v);
};
const normHex = (c?: string) => {
  if (!c) return '#000000';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  return '#000000';
};

export function updateInspector() {
  const sels = selectedEls();
  const body = $('#inspBody'), empty = $('#inspEmpty');
  if (!sels.length) { body.style.display = 'none'; empty.style.display = 'block'; return; }
  body.style.display = 'block'; empty.style.display = 'none';

  const el = sels[0];
  const b = getBBoxOf(el);
  if (b) {
    setVal('#inpX', round(b.x));
    setVal('#inpY', round(b.y));
    setVal('#inpW', Math.max(1, round(b.width)));
    setVal('#inpH', Math.max(1, round(b.height)));
  }
  setVal('#inpRot', round(el.meta.rotation || 0));

  const fill = el.attrs.fill as string;
  const hasFill = !!fill && fill !== 'none';
  ($('#fillColor') as HTMLInputElement).value = normHex(hasFill ? fill : '#7c8aff');
  setVal('#fillHex', hasFill ? fill : 'none');
  $('#fillNone').classList.toggle('on', !hasFill);
  const fo = el.attrs['fill-opacity'] !== undefined ? parseFloat(String(el.attrs['fill-opacity'])) : 1;
  setVal('#fillOpacity', Math.round(fo * 100));
  $('#fillOpacityVal').textContent = Math.round(fo * 100) + '%';

  const stroke = el.attrs.stroke as string;
  const hasStroke = !!stroke && stroke !== 'none' && parseFloat(String(el.attrs['stroke-width'] || 0)) > 0;
  ($('#strokeColor') as HTMLInputElement).value = normHex(hasStroke ? stroke : '#1e1e1e');
  setVal('#strokeHex', hasStroke ? stroke : 'none');
  $('#strokeNone').classList.toggle('on', !hasStroke);
  setVal('#strokeWidth', hasStroke ? (el.attrs['stroke-width'] || 0) : 0);
  setVal('#strokeDash', el.attrs['stroke-dasharray'] || 'none');
  setVal('#strokeCap', el.attrs['stroke-linecap'] || 'butt');
  setVal('#strokeJoin', el.attrs['stroke-linejoin'] || 'miter');

  const op = el.attrs.opacity !== undefined ? parseFloat(String(el.attrs.opacity)) : 1;
  setVal('#elOpacity', Math.round(op * 100));
  $('#elOpacityVal').textContent = Math.round(op * 100) + '%';

  $('#sectRect').style.display = el.type === 'rect' ? 'block' : 'none';
  $('#sectText').style.display = el.type === 'text' ? 'block' : 'none';
  $('#sectPoly').style.display = el.type === 'polygon' ? 'block' : 'none';
  $('#sectPath').style.display = el.type === 'path' ? 'block' : 'none';

  if (el.type === 'rect') setVal('#cornerRadius', parseFloat(String(el.attrs.rx)) || 0);
  if (el.type === 'text') {
    setVal('#textContent', el.text || '');
    setVal('#textSize', parseFloat(String(el.attrs['font-size'])) || 24);
    setVal('#textWeight', String(el.attrs['font-weight'] || '400'));
  }
  if (el.type === 'polygon') {
    setVal('#polySides', el.meta.sides || 5);
    ($('#polyStar') as HTMLInputElement).checked = !!el.meta.star;
  }
}

export function syncInspectorValues() {
  const el = firstSel(); if (!el) return;
  const b = getBBoxOf(el); if (!b) return;
  setVal('#inpX', round(b.x));
  setVal('#inpY', round(b.y));
  setVal('#inpW', Math.max(1, round(b.width)));
  setVal('#inpH', Math.max(1, round(b.height)));
  setVal('#inpRot', round(el.meta.rotation || 0));
}

export function bindInspector() {
  const el0 = () => firstSel();

  const applyMove = (axis: 'x' | 'y', value: number) => {
    const el = el0(); if (!el) return;
    const b = getBBoxOf(el); if (!b) return;
    const d = axis === 'x' ? value - b.x : value - b.y;
    el.attrs = translateAttrs(el.attrs, el.type, axis === 'x' ? d : 0, axis === 'y' ? d : 0);
    if (el.meta.pivot) {
      if (axis === 'x') el.meta.pivot.x += d;
      else el.meta.pivot.y += d;
    }
    if (el.meta.cmds) el.meta.cmds = null;
    renderLive();
  };
  $('#inpX').addEventListener('input', (e) => applyMove('x', parseFloat((e.target as HTMLInputElement).value)));
  $('#inpY').addEventListener('input', (e) => applyMove('y', parseFloat((e.target as HTMLInputElement).value)));
  $('#inpX').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#inpY').addEventListener('change', () => { pushHistory(); renderAll(); });

  const applySize = (axis: 'w' | 'h', value: number) => {
    const el = el0(); if (!el) return;
    const b = getBBoxOf(el); if (!b) return;
    value = Math.max(1, value);
    const box1 = axis === 'w'
      ? { x: b.x, y: b.y, width: value, height: b.height }
      : { x: b.x, y: b.y, width: b.width, height: value };
    el.attrs = scaleAttrs(el.attrs, el.type, b, box1);
    el.meta.cmds = null;
    renderLive();
  };
  $('#inpW').addEventListener('input', (e) => applySize('w', parseFloat((e.target as HTMLInputElement).value)));
  $('#inpH').addEventListener('input', (e) => applySize('h', parseFloat((e.target as HTMLInputElement).value)));
  $('#inpW').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#inpH').addEventListener('change', () => { pushHistory(); renderAll(); });

  $('#inpRot').addEventListener('input', (e) => {
    const el = el0(); if (!el) return;
    const v = parseFloat((e.target as HTMLInputElement).value); if (isNaN(v)) return;
    const b = getBBoxOf(el); if (!b) return;
    if (!el.meta.pivot || !el.meta.rotation) {
      el.meta.pivot = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    el.meta.rotation = ((v % 360) + 360) % 360;
    renderLive();
  });
  $('#inpRot').addEventListener('change', () => { pushHistory(); renderAll(); });

  const setFill = (hex: string) => {
    const el = el0(); if (!el) return;
    el.attrs.fill = hex;
    state.style.fill = hex;
    state.style.fillNone = hex === 'none';
    renderLive();
  };
  $('#fillColor').addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    setFill(v); ($('#fillHex') as HTMLInputElement).value = v;
  });
  $('#fillColor').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#fillHex').addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value.trim();
    if (/^#[0-9a-f]{6}$/i.test(v) || /^#[0-9a-f]{3}$/i.test(v)) {
      setFill(v); ($('#fillColor') as HTMLInputElement).value = normHex(v);
    }
  });
  $('#fillHex').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#fillNone').addEventListener('click', () => { setFill('none'); pushHistory(); renderAll(); });
  $('#fillOpacity').addEventListener('input', (e) => {
    const el = el0(); if (!el) return;
    const v = parseInt((e.target as HTMLInputElement).value, 10) / 100;
    if (v >= 1) delete el.attrs['fill-opacity']; else el.attrs['fill-opacity'] = v;
    $('#fillOpacityVal').textContent = Math.round(v * 100) + '%';
    renderLive();
  });
  $('#fillOpacity').addEventListener('change', () => { pushHistory(); renderAll(); });

  const setStroke = (hex: string) => {
    const el = el0(); if (!el) return;
    if (hex === 'none') { el.attrs.stroke = 'none'; state.style.strokeNone = true; }
    else {
      el.attrs.stroke = hex;
      state.style.stroke = hex; state.style.strokeNone = false;
      let sw = parseFloat(String(el.attrs['stroke-width'])) || 0;
      if (sw <= 0) { sw = 2; el.attrs['stroke-width'] = sw; }
    }
    renderLive();
  };
  $('#strokeColor').addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value;
    setStroke(v); ($('#strokeHex') as HTMLInputElement).value = v;
  });
  $('#strokeColor').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#strokeHex').addEventListener('input', (e) => {
    const v = (e.target as HTMLInputElement).value.trim();
    if (/^#[0-9a-f]{6}$/i.test(v) || /^#[0-9a-f]{3}$/i.test(v)) {
      setStroke(v); ($('#strokeColor') as HTMLInputElement).value = normHex(v);
    }
  });
  $('#strokeHex').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#strokeNone').addEventListener('click', () => {
    const el = el0(); if (!el) return;
    el.attrs.stroke = 'none'; state.style.strokeNone = true;
    pushHistory(); renderAll();
  });
  $('#strokeWidth').addEventListener('input', (e) => {
    const el = el0(); if (!el) return;
    const v = Math.max(0, parseFloat((e.target as HTMLInputElement).value) || 0);
    el.attrs['stroke-width'] = v;
    if (v > 0) {
      if (!el.attrs.stroke || el.attrs.stroke === 'none') el.attrs.stroke = state.style.stroke;
      state.style.strokeNone = false;
    } else el.attrs.stroke = 'none';
    renderLive();
  });
  $('#strokeWidth').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#strokeDash').addEventListener('change', (e) => {
    const el = el0(); if (!el) return;
    const v = (e.target as HTMLSelectElement).value;
    if (v === 'none') delete el.attrs['stroke-dasharray'];
    else el.attrs['stroke-dasharray'] = v;
    pushHistory(); renderAll();
  });
  $('#strokeCap').addEventListener('change', (e) => {
    const el = el0(); if (!el) return;
    const v = (e.target as HTMLSelectElement).value;
    if (v === 'butt') delete el.attrs['stroke-linecap'];
    else el.attrs['stroke-linecap'] = v;
    pushHistory(); renderAll();
  });
  $('#strokeJoin').addEventListener('change', (e) => {
    const el = el0(); if (!el) return;
    const v = (e.target as HTMLSelectElement).value;
    if (v === 'miter') delete el.attrs['stroke-linejoin'];
    else el.attrs['stroke-linejoin'] = v;
    pushHistory(); renderAll();
  });

  $('#elOpacity').addEventListener('input', (e) => {
    const el = el0(); if (!el) return;
    const v = parseInt((e.target as HTMLInputElement).value, 10) / 100;
    if (v >= 1) delete el.attrs.opacity; else el.attrs.opacity = v;
    $('#elOpacityVal').textContent = Math.round(v * 100) + '%';
    renderLive();
  });
  $('#elOpacity').addEventListener('change', () => { pushHistory(); renderAll(); });

  $('#cornerRadius').addEventListener('input', (e) => {
    const el = el0(); if (!el || el.type !== 'rect') return;
    const v = Math.max(0, parseFloat((e.target as HTMLInputElement).value) || 0);
    const b = getBBoxOf(el);
    const r = b ? Math.min(v, Math.min(b.width, b.height) / 2) : v;
    if (r > 0) { el.attrs.rx = r; el.attrs.ry = r; }
    else { delete el.attrs.rx; delete el.attrs.ry; }
    renderLive();
  });
  $('#cornerRadius').addEventListener('change', () => { pushHistory(); renderAll(); });

  $('#textContent').addEventListener('input', (e) => {
    const el = el0(); if (!el || el.type !== 'text') return;
    el.text = (e.target as HTMLTextAreaElement).value; renderLive();
  });
  $('#textContent').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#textSize').addEventListener('input', (e) => {
    const el = el0(); if (!el || el.type !== 'text') return;
    el.attrs['font-size'] = Math.max(1, parseFloat((e.target as HTMLInputElement).value) || 1);
    renderLive();
  });
  $('#textSize').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#textWeight').addEventListener('change', (e) => {
    const el = el0(); if (!el || el.type !== 'text') return;
    el.attrs['font-weight'] = (e.target as HTMLSelectElement).value;
    pushHistory(); renderAll();
  });

  const regeneratePolygon = () => {
    const el = el0(); if (!el || el.type !== 'polygon') return;
    const b = getBBoxOf(el); if (!b) return;
    el.attrs.points = starPointsStr(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, b.height / 2, el.meta.sides || 5, el.meta.star !== false, 0.45);
    renderLive();
  };
  $('#polySides').addEventListener('input', (e) => {
    const el = el0(); if (!el) return;
    el.meta.sides = Math.max(3, Math.min(24, parseInt((e.target as HTMLInputElement).value, 10) || 5));
    regeneratePolygon();
  });
  $('#polySides').addEventListener('change', () => { pushHistory(); renderAll(); });
  $('#polyStar').addEventListener('change', (e) => {
    const el = el0(); if (!el) return;
    el.meta.star = (e.target as HTMLInputElement).checked;
    regeneratePolygon();
    pushHistory(); renderAll();
  });

  $('#btnEditNodes').addEventListener('click', () => {
    const el = el0();
    if (el && el.type === 'path') {
      state.nodeEditId = el.id;
      el.meta.cmds = parsePathData(el.attrs.d as string);
      renderAll();
    }
  });
}