/* ============================================================
 * features/smartGuides.ts — Alignment detection & rendering
 * ============================================================ */

import type { BBox } from '../types';
import { state } from '../core/state';
import { getBBoxOf } from '../geometry/bbox';
import { CONFIG } from '../config';
import { createSVG } from '../utils/dom';

export interface Guide {
  orientation: 'h' | 'v';
  position: number;
  start: number;
  end: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

export interface ResizeSnapResult {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  guides: Guide[];
}

interface Target {
  pos: number;
  bbox: BBox | null;   // null = canvas (edge / center)
}

/* ---------- Collect semua kandidat garis ---------- */
function collectTargets(excludeIds: Set<string>): { v: Target[]; h: Target[] } {
  const v: Target[] = [];
  const h: Target[] = [];
  const cw = state.canvas.width;
  const ch = state.canvas.height;

  /* Canvas edges + center */
  v.push({ pos: 0, bbox: null });
  v.push({ pos: cw / 2, bbox: null });
  v.push({ pos: cw, bbox: null });
  h.push({ pos: 0, bbox: null });
  h.push({ pos: ch / 2, bbox: null });
  h.push({ pos: ch, bbox: null });

  /* Other elements */
  for (const el of state.elements) {
    if (el.hidden || el.locked) continue;
    if (excludeIds.has(el.id)) continue;
    const bb = getBBoxOf(el);
    if (!bb) continue;

    v.push({ pos: bb.x, bbox: bb });
    v.push({ pos: bb.x + bb.width / 2, bbox: bb });
    v.push({ pos: bb.x + bb.width, bbox: bb });

    h.push({ pos: bb.y, bbox: bb });
    h.push({ pos: bb.y + bb.height / 2, bbox: bb });
    h.push({ pos: bb.y + bb.height, bbox: bb });
  }
  return { v, h };
}

function makeGuide(
  target: Target,
  orientation: 'v' | 'h',
  movingBox: BBox,
): Guide {
  if (orientation === 'v') {
    const start = target.bbox
      ? Math.min(target.bbox.y, movingBox.y)
      : 0;
    const end = target.bbox
      ? Math.max(target.bbox.y + target.bbox.height, movingBox.y + movingBox.height)
      : state.canvas.height;
    return { orientation: 'v', position: target.pos, start, end };
  }
  const start = target.bbox
    ? Math.min(target.bbox.x, movingBox.x)
    : 0;
  const end = target.bbox
    ? Math.max(target.bbox.x + target.bbox.width, movingBox.x + movingBox.width)
    : state.canvas.width;
  return { orientation: 'h', position: target.pos, start, end };
}

/* ============================================================
 * MOVE — snap bbox terhadap target
 * ============================================================ */
export function computeSnap(movingBox: BBox, excludeIds: Set<string>): SnapResult {
  if (!CONFIG.smartGuides.enabled) {
    return { dx: 0, dy: 0, guides: [] };
  }

  const threshold = CONFIG.smartGuides.thresholdScreen / state.zoom;
  const { v, h } = collectTargets(excludeIds);

  const myXs = [movingBox.x, movingBox.x + movingBox.width / 2, movingBox.x + movingBox.width];
  const myYs = [movingBox.y, movingBox.y + movingBox.height / 2, movingBox.y + movingBox.height];

  let bestDx = 0, bestVTarget: Target | null = null, bestVdist = threshold + 1;
  let bestDy = 0, bestHTarget: Target | null = null, bestHdist = threshold + 1;

  for (const t of v) {
    for (const mine of myXs) {
      const d = Math.abs(t.pos - mine);
      if (d < bestVdist) {
        bestVdist = d;
        bestDx = t.pos - mine;
        bestVTarget = t;
      }
    }
  }
  for (const t of h) {
    for (const mine of myYs) {
      const d = Math.abs(t.pos - mine);
      if (d < bestHdist) {
        bestHdist = d;
        bestDy = t.pos - mine;
        bestHTarget = t;
      }
    }
  }

  const guides: Guide[] = [];
  const snappedBox: BBox = {
    x: movingBox.x + (bestVTarget ? bestDx : 0),
    y: movingBox.y + (bestHTarget ? bestDy : 0),
    width: movingBox.width,
    height: movingBox.height,
  };

  if (bestVTarget) guides.push(makeGuide(bestVTarget, 'v', snappedBox));
  if (bestHTarget) guides.push(makeGuide(bestHTarget, 'h', snappedBox));

  return {
    dx: bestVTarget ? bestDx : 0,
    dy: bestHTarget ? bestDy : 0,
    guides,
  };
}

/* ============================================================
 * RESIZE — snap tepi yang bergerak
 * ============================================================ */
export function snapResize(
  x1: number, y1: number, x2: number, y2: number,
  key: string,
  excludeIds: Set<string>,
): ResizeSnapResult {
  if (!CONFIG.smartGuides.enabled) {
    return { x1, y1, x2, y2, guides: [] };
  }

  const threshold = CONFIG.smartGuides.thresholdScreen / state.zoom;
  const { v, h } = collectTargets(excludeIds);
  const guides: Guide[] = [];

  const snapEdge = (
    value: number,
    targets: Target[],
    orientation: 'v' | 'h',
    movingBox: BBox,
  ): number => {
    let bestD = threshold + 1, bestT: Target | null = null;
    for (const t of targets) {
      const d = Math.abs(t.pos - value);
      if (d < bestD) { bestD = d; bestT = t; }
    }
    if (!bestT || bestD > threshold) return value;
    guides.push(makeGuide(bestT, orientation, movingBox));
    return bestT.pos;
  };

  /* Snap sisi horizontal (x1/x2) ke vertical targets */
  if (key.includes('w')) {
    x1 = snapEdge(x1, v, 'v', { x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  }
  if (key.includes('e')) {
    x2 = snapEdge(x2, v, 'v', { x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  }
  if (key.includes('n')) {
    y1 = snapEdge(y1, h, 'h', { x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  }
  if (key.includes('s')) {
    y2 = snapEdge(y2, h, 'h', { x: x1, y: y1, width: x2 - x1, height: y2 - y1 });
  }

  return { x1, y1, x2, y2, guides };
}

/* ============================================================
 * RENDER — gambar garis bantu
 * ============================================================ */
export function renderGuides(guides: Guide[]) {
  const g = document.getElementById('guides');
  if (!g) return;
  g.innerHTML = '';

  if (!guides.length) return;

  const color = CONFIG.smartGuides.color;

  for (const guide of guides) {
    const attrs = guide.orientation === 'v'
      ? { x1: guide.position, y1: guide.start, x2: guide.position, y2: guide.end }
      : { x1: guide.start, y1: guide.position, x2: guide.end, y2: guide.position };

    g.appendChild(createSVG('line', {
      ...attrs,
      stroke: color,
      'stroke-width': '1',
      'vector-effect': 'non-scaling-stroke',
      'stroke-dasharray': '4 3',
      'pointer-events': 'none',
    }));

    /* Endpoint dots untuk visual emphasis */
    const dotAttrs = guide.orientation === 'v'
      ? [
          { cx: guide.position, cy: guide.start },
          { cx: guide.position, cy: guide.end },
        ]
      : [
          { cx: guide.start, cy: guide.position },
          { cx: guide.end, cy: guide.position },
        ];

    for (const dot of dotAttrs) {
      g.appendChild(createSVG('circle', {
        ...dot,
        r: 2 / state.zoom,
        fill: color,
        'pointer-events': 'none',
      }));
    }
  }
}