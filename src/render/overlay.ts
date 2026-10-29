import { state, drag, selectedEls, getElById } from '../core/state';
import { CONFIG } from '../config';
import { createSVG, $ } from '../utils/dom';
import { getBBoxOf, unionBBox } from '../geometry/bbox';
import { rotPoint } from '../geometry/transforms';
import { dist } from '../utils/math';
import type { SvgElement, PathCommand } from '../types';
import { parsePathData, buildPathData } from '../utils/path';

export function toCanvas(e: PointerEvent | { clientX: number; clientY: number }) {
  const stage = $('#stage');
  const r = stage.getBoundingClientRect();
  return {
    x: (e.clientX - r.left - state.pan.x) / state.zoom,
    y: (e.clientY - r.top - state.pan.y) / state.zoom,
  };
}

export function renderOverlay() {
  const g = $('#overlay');
  g.innerHTML = '';

  if (drag && drag.type === 'create' && drag.cur) {
    const p0 = drag.start, p1 = drag.cur;
    const x = Math.min(p0.x, p1.x), y = Math.min(p0.y, p1.y);
    const w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
    let s: SVGElement;
    if (drag.tool === 'ellipse') s = createSVG('ellipse', { cx: x + w/2, cy: y + h/2, rx: w/2, ry: h/2 });
    else if (drag.tool === 'line') s = createSVG('line', { x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y });
    else s = createSVG('rect', { x, y, width: w, height: h });
    s.setAttribute('fill', 'rgba(124,138,255,0.14)');
    s.setAttribute('stroke', '#7c8aff');
    s.setAttribute('stroke-width', '1');
    s.setAttribute('vector-effect', 'non-scaling-stroke');
    s.setAttribute('stroke-dasharray', '4 3');
    s.setAttribute('pointer-events', 'none');
    g.appendChild(s);
  }

  if (drag && drag.type === 'marquee' && drag.cur) {
    const p0 = drag.start, p1 = drag.cur;
    g.appendChild(createSVG('rect', {
      x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y),
      width: Math.abs(p1.x - p0.x), height: Math.abs(p1.y - p0.y),
      fill: 'rgba(124,138,255,0.08)',
      stroke: '#7c8aff', 'stroke-width': '1',
      'vector-effect': 'non-scaling-stroke',
      'stroke-dasharray': '4 3', 'pointer-events': 'none',
    }));
  }

  if (state.pathDraft && state.pathDraft.points.length) {
    const pts = state.pathDraft.points;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
    g.appendChild(createSVG('path', {
      d, fill: 'none', stroke: '#7c8aff',
      'stroke-width': '1.5', 'vector-effect': 'non-scaling-stroke',
      'pointer-events': 'none',
    }));
    const hs = CONFIG.handleSize / state.zoom;
    pts.forEach((pt, i) => {
      g.appendChild(createSVG('circle', {
        cx: pt.x, cy: pt.y, r: hs / 2,
        fill: i === 0 ? '#7c8aff' : '#fff',
        stroke: '#7c8aff', 'stroke-width': '1',
        'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none',
      }));
    });
  }

  if (state.nodeEditId) { renderNodeHandles(); return; }

  const sels = selectedEls().filter(e => !e.hidden);
  if (!sels.length) return;

  if (sels.length === 1) drawSelectionBox(sels[0]);
  else {
    const bb = unionBBox(sels);
    if (!bb) return;
    g.appendChild(createSVG('rect', {
      x: bb.x, y: bb.y, width: bb.width, height: bb.height,
      fill: 'none', stroke: '#7c8aff', 'stroke-width': '1',
      'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': '5 4',
      'pointer-events': 'none',
    }));
  }
}

function drawSelectionBox(el: SvgElement) {
  const b = getBBoxOf(el);
  if (!b) return;
  const z = state.zoom, hs = CONFIG.handleSize / z, roff = CONFIG.rotOffset / z;
  const g = createSVG('g');
  const rot = el.meta.rotation || 0;
  if (Math.abs(rot) > 0.001 && el.meta.pivot) {
    g.setAttribute('transform', `rotate(${rot} ${el.meta.pivot.x} ${el.meta.pivot.y})`);
  }
  g.appendChild(createSVG('rect', {
    x: b.x, y: b.y, width: b.width, height: b.height,
    fill: 'none', stroke: '#7c8aff', 'stroke-width': '1',
    'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none',
  }));

  const rcx = b.x + b.width / 2, rcy = b.y - roff;
  g.appendChild(createSVG('line', {
    x1: rcx, y1: b.y, x2: rcx, y2: rcy,
    stroke: '#7c8aff', 'stroke-width': '1',
    'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none',
  }));
  const rh = createSVG('circle', {
    cx: rcx, cy: rcy, r: hs * 0.6, fill: '#fff',
    stroke: '#7c8aff', 'stroke-width': '1.5',
    'vector-effect': 'non-scaling-stroke',
  });
  (rh as SVGElement).style.cursor = 'grab';
  g.appendChild(rh);

  const positions: Record<string, [number, number]> = {
    nw: [b.x, b.y],
    n: [b.x + b.width / 2, b.y],
    ne: [b.x + b.width, b.y],
    e: [b.x + b.width, b.y + b.height / 2],
    se: [b.x + b.width, b.y + b.height],
    s: [b.x + b.width / 2, b.y + b.height],
    sw: [b.x, b.y + b.height],
    w: [b.x, b.y + b.height / 2],
  };
  const cursors: Record<string, string> = {
    nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
    se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
  };
  for (const key in positions) {
    const [hx, hy] = positions[key];
    const h = createSVG('rect', {
      x: hx - hs / 2, y: hy - hs / 2, width: hs, height: hs,
      fill: '#ffffff', stroke: '#7c8aff', 'stroke-width': '1.5',
      'vector-effect': 'non-scaling-stroke',
    });
    (h as SVGElement).style.cursor = cursors[key];
    h.setAttribute('data-handle', key);
    h.setAttribute('data-elid', el.id);
    g.appendChild(h);
  }
  $('#overlay').appendChild(g);
}

function renderNodeHandles() {
  const el = getElById(state.nodeEditId!);
  if (!el || el.type !== 'path') { state.nodeEditId = null; return; }
  if (!el.meta.cmds) el.meta.cmds = parsePathData(el.attrs.d as string);

  const hs = CONFIG.handleSize / state.zoom;
  const g = createSVG('g');
  if (Math.abs(el.meta.rotation || 0) > 0.001 && el.meta.pivot) {
    g.setAttribute('transform', `rotate(${el.meta.rotation} ${el.meta.pivot.x} ${el.meta.pivot.y})`);
  }

  const anchors = getAnchorList(el.meta.cmds);
  anchors.forEach(an => {
    if (an.type === 'ctrl') {
      const hostCmd = el.meta.cmds![an.ci];
      const endIdx = hostCmd.pts.length - 2;
      g.appendChild(createSVG('line', {
        x1: hostCmd.pts[an.pi], y1: hostCmd.pts[an.pi + 1],
        x2: hostCmd.pts[endIdx], y2: hostCmd.pts[endIdx + 1],
        stroke: '#7c8aff', 'stroke-width': '1',
        'vector-effect': 'non-scaling-stroke', 'stroke-dasharray': '3 2',
        'pointer-events': 'none',
      }));
    }
    const isCtrl = an.type === 'ctrl';
    const node = isCtrl
      ? createSVG('circle', {
          cx: an.x, cy: an.y, r: hs * 0.32,
          fill: '#7c8aff', stroke: '#fff',
          'stroke-width': '1', 'vector-effect': 'non-scaling-stroke',
        })
      : createSVG('rect', {
          x: an.x - hs / 2, y: an.y - hs / 2, width: hs, height: hs,
          fill: (state.nodeSel && state.nodeSel.ci === an.ci && state.nodeSel.pi === an.pi) ? '#7c8aff' : '#fff',
          stroke: '#7c8aff', 'stroke-width': '1.5',
          'vector-effect': 'non-scaling-stroke',
        });
    (node as SVGElement).style.cursor = 'move';
    node.setAttribute('data-nodeci', String(an.ci));
    node.setAttribute('data-nodepi', String(an.pi));
    node.setAttribute('data-elid', el.id);
    g.appendChild(node);
  });

  $('#overlay').appendChild(g);
}

function getAnchorList(cmds: PathCommand[]) {
  const list: { ci: number; pi: number; x: number; y: number; type: 'anchor' | 'ctrl' }[] = [];
  cmds.forEach((cmd, ci) => {
    const p = cmd.pts;
    if (cmd.c === 'M' || cmd.c === 'L' || cmd.c === 'T') {
      if (p.length >= 2) list.push({ ci, pi: 0, x: p[0], y: p[1], type: 'anchor' });
    } else if (cmd.c === 'C') {
      list.push({ ci, pi: 0, x: p[0], y: p[1], type: 'ctrl' });
      list.push({ ci, pi: 2, x: p[2], y: p[3], type: 'ctrl' });
      list.push({ ci, pi: 4, x: p[4], y: p[5], type: 'anchor' });
    } else if (cmd.c === 'S' || cmd.c === 'Q') {
      list.push({ ci, pi: 0, x: p[0], y: p[1], type: 'ctrl' });
      list.push({ ci, pi: 2, x: p[2], y: p[3], type: 'anchor' });
    } else if (cmd.c === 'A') {
      list.push({ ci, pi: 5, x: p[5], y: p[6], type: 'anchor' });
    }
  });
  return list;
}

/** Used by pointer to detect draft closing */
export function isNearFirstPoint(pt: { x: number; y: number }) {
  if (!state.pathDraft || state.pathDraft.points.length < 3) return false;
  return dist(pt, state.pathDraft.points[0]) * state.zoom < 12;
}

export { parsePathData, buildPathData, rotPoint };