/* ============================================================
 * io/importer.ts — SVG import with <g> → group parsing
 * ============================================================ */

import type { SvgElement, Matrix } from '../types';
import { state } from '../core/state';
import { CONFIG } from '../config';
import { makeElement } from '../model/factory';
import { applyMatrixToPath, parsePathData } from '../utils/path';
import { pushHistory } from '../core/history';
import { updateCanvasSize } from '../render/grid';
import { zoomToFit } from '../render/viewport';
import { toast } from '../tools/toast';

const STYLE_PROPS = [
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin',
  'opacity', 'fill-opacity', 'stroke-opacity',
];

function pickStyle(node: Element): Record<string, string> {
  const a: Record<string, string> = {};
  for (const p of STYLE_PROPS) {
    const v = node.getAttribute(p);
    if (v !== null && v !== '') a[p] = v;
  }
  if (!a.fill) a.fill = '#000000';
  if (!a.stroke) a.stroke = 'none';
  return a;
}

function isIdentity(m: Matrix): boolean {
  return Math.abs(m.a - 1) < 1e-6 && Math.abs(m.b) < 1e-6 &&
         Math.abs(m.c) < 1e-6 && Math.abs(m.d - 1) < 1e-6 &&
         Math.abs(m.e) < 1e-6 && Math.abs(m.f) < 1e-6;
}

function getCTMOf(node: Element): Matrix {
  try {
    const m = (node as SVGGraphicsElement).getCTM();
    if (!m) return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
  } catch {
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }
}

function walkSVG(node: Element, out: SvgElement[], parentGroupId?: string) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();
    if (['defs', 'title', 'desc', 'style', 'metadata', 'clippath',
         'lineargradient', 'radialgradient', 'filter'].includes(tag)) continue;

    /* --- Nested <g> → group --- */
    if (tag === 'g') {
      const newGid = `grp_${state.nextId++}`;
      const childOut: SvgElement[] = [];
      walkSVG(child, childOut, newGid);

      // Only apply newGid to elements not already grouped
      childOut.forEach(e => { if (!e.groupId) e.groupId = newGid; });

      // Register group name if ≥2 members actually belong to this group
      const memberCount = childOut.filter(e => e.groupId === newGid).length;
      if (memberCount > 1) {
        const idAttr = child.getAttribute('id');
        state.groupNames[newGid] = idAttr
          ? idAttr.replace(/_/g, ' ')
          : `Group ${Object.keys(state.groupNames).length + 1}`;
      } else {
        // Clean up if single member
        childOut.forEach(e => {
          if (e.groupId === newGid) delete e.groupId;
        });
      }

      out.push(...childOut);
      continue;
    }

    if (tag === 'svg' || tag === 'a') {
      walkSVG(child, out, parentGroupId);
      continue;
    }

    const el = svgNodeToElement(child);
    if (el) {
      if (parentGroupId) el.groupId = parentGroupId;
      out.push(el);
    }
  }
}

function svgNodeToElement(node: Element): SvgElement | null {
  const tag = node.tagName.toLowerCase();
  const m = getCTMOf(node);
  const ident = isIdentity(m);
  const style = pickStyle(node);

  const toPath = (dStr: string) => {
    const d = applyMatrixToPath(dStr, m);
    const a = { ...style, d };
    const el = makeElement('path', a);
    el.meta.cmds = parsePathData(d);
    return el;
  };

  if (tag === 'text') {
    const a: Record<string, any> = { ...style };
    a.x = parseFloat(node.getAttribute('x') || '0') || 0;
    a.y = parseFloat(node.getAttribute('y') || '0') || 0;
    a['font-family'] = node.getAttribute('font-family') || 'Inter, system-ui, sans-serif';
    a['font-size'] = parseFloat(node.getAttribute('font-size') || '24') || 24;
    const w = node.getAttribute('font-weight');
    if (w) a['font-weight'] = w;
    const el = makeElement('text', a);
    el.text = node.textContent || '';
    if (!ident) {
      el.attrs.transform =
        `matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
    }
    return el;
  }

  if (tag === 'rect') {
    const x = parseFloat(node.getAttribute('x') || '0') || 0;
    const y = parseFloat(node.getAttribute('y') || '0') || 0;
    const w = parseFloat(node.getAttribute('width') || '0') || 0;
    const h = parseFloat(node.getAttribute('height') || '0') || 0;
    const rx = parseFloat(node.getAttribute('rx') || '0') || 0;
    if (w <= 0 || h <= 0) return null;

    if (ident) {
      const a: Record<string, any> = { ...style, x, y, width: w, height: h };
      if (rx) {
        a.rx = rx;
        a.ry = parseFloat(node.getAttribute('ry') || '0') || rx;
      }
      return makeElement('rect', a);
    }
    return toPath(`M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`);
  }

  if (tag === 'circle') {
    const cx = parseFloat(node.getAttribute('cx') || '0') || 0;
    const cy = parseFloat(node.getAttribute('cy') || '0') || 0;
    const r = parseFloat(node.getAttribute('r') || '0') || 0;
    if (r <= 0) return null;

    if (ident) return makeElement('ellipse', { ...style, cx, cy, rx: r, ry: r });

    const k = 0.5522847498 * r;
    return toPath(
      `M ${cx + r} ${cy} ` +
      `C ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} ` +
      `C ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} ` +
      `C ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} ` +
      `C ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} Z`,
    );
  }

  if (tag === 'ellipse') {
    const cx = parseFloat(node.getAttribute('cx') || '0') || 0;
    const cy = parseFloat(node.getAttribute('cy') || '0') || 0;
    const rx = parseFloat(node.getAttribute('rx') || '0') || 0;
    const ry = parseFloat(node.getAttribute('ry') || '0') || 0;
    if (rx <= 0 || ry <= 0) return null;

    if (ident) return makeElement('ellipse', { ...style, cx, cy, rx, ry });

    const kx = 0.5522847498 * rx, ky = 0.5522847498 * ry;
    return toPath(
      `M ${cx + rx} ${cy} ` +
      `C ${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry} ` +
      `C ${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy} ` +
      `C ${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry} ` +
      `C ${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy} Z`,
    );
  }

  if (tag === 'line') {
    const x1 = parseFloat(node.getAttribute('x1') || '0') || 0;
    const y1 = parseFloat(node.getAttribute('y1') || '0') || 0;
    const x2 = parseFloat(node.getAttribute('x2') || '0') || 0;
    const y2 = parseFloat(node.getAttribute('y2') || '0') || 0;

    if (ident) {
      const a: Record<string, any> = { ...style, x1, y1, x2, y2 };
      if (a.fill && a.fill !== 'none') a.fill = 'none';
      if (!a.stroke || a.stroke === 'none') a.stroke = '#000000';
      return makeElement('line', a);
    }
    return toPath(`M ${x1} ${y1} L ${x2} ${y2}`);
  }

  if (tag === 'polygon' || tag === 'polyline') {
    const ptsStr = node.getAttribute('points') || '';
    const nums = ptsStr.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
    if (!nums || nums.length < 4) return null;

    let d = `M ${nums[0]} ${nums[1]}`;
    for (let i = 2; i + 1 < nums.length; i += 2) d += ` L ${nums[i]} ${nums[i + 1]}`;
    if (tag === 'polygon') d += ' Z';

    if (ident) {
      const a: Record<string, any> = { ...style, points: ptsStr.trim() };
      if (tag === 'polyline' && (!a.fill || a.fill !== 'none')) a.fill = 'none';
      const el = makeElement('polygon', a);
      el.meta.cmds = parsePathData(d);
      return el;
    }
    const el = toPath(d);
    if (tag === 'polyline' && (!el.attrs.fill || el.attrs.fill !== 'none')) {
      el.attrs.fill = 'none';
    }
    return el;
  }

  if (tag === 'path') {
    const d = node.getAttribute('d');
    if (!d) return null;
    return toPath(d);
  }

  return null;
}

export function importSVGText(text: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error('SVG tidak valid');

  const svgRoot = doc.documentElement;
  if (!svgRoot || svgRoot.nodeName.toLowerCase() !== 'svg') throw new Error('Bukan file SVG');

  /* --- Determine canvas size --- */
  let w = 0, h = 0;
  const vb = svgRoot.getAttribute('viewBox');
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p[2] > 0 && p[3] > 0) { w = p[2]; h = p[3]; }
  }
  if (!w) w = parseFloat(svgRoot.getAttribute('width') || '0') || CONFIG.canvas.width;
  if (!h) h = parseFloat(svgRoot.getAttribute('height') || '0') || CONFIG.canvas.height;
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));

  /* --- Render temporary (hidden) untuk hitung CTM --- */
  const holder = document.createElement('div');
  holder.style.cssText = `position:absolute;left:-99999px;top:0;width:${w}px;height:${h}px;overflow:hidden;`;
  const clone = document.importNode(svgRoot, true);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  holder.appendChild(clone);
  document.body.appendChild(holder);

  const newEls: SvgElement[] = [];
  try {
    walkSVG(clone, newEls);
  } finally {
    document.body.removeChild(holder);
  }

  if (!newEls.length) throw new Error('Tidak ada elemen yang bisa di-import');

  /* --- Commit --- */
  state.canvas = { width: w, height: h };
  state.elements = newEls;
  state.selection = [];
  state.nodeEditId = null;
  updateCanvasSize();
  pushHistory();
  zoomToFit();
  toast(`Imported ${newEls.length} elemen`);
}