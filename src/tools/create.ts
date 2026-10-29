import type { SvgElement, ToolId, Point } from '../types';
import { state, setDrag } from '../core/state';
import { makeElement, typeLabel } from '../model/factory';
import { styleAttrs } from '../model/style';
import { CONFIG } from '../config';
import { round } from '../utils/math';
import { parsePathData } from '../utils/path';
import { renderOverlay } from '../render/overlay';

export function starPointsStr(
  cx: number, cy: number, rx: number, ry: number,
  sides: number, star: boolean, innerRatio: number,
): string {
  const n = Math.max(3, sides | 0);
  const total = star ? n * 2 : n;
  const pts: string[] = [];
  for (let i = 0; i < total; i++) {
    const rr = star && i % 2 === 1 ? innerRatio : 1;
    const a = -Math.PI / 2 + i * (2 * Math.PI / total);
    pts.push(round(cx + Math.cos(a) * rx * rr) + ',' + round(cy + Math.sin(a) * ry * rr));
  }
  return pts.join(' ');
}

/* ============================================================
   PATH GENERATORS untuk shape kompleks
   Semua fungsi menerima bounding box (x, y, w, h) dan mengembalikan "d"
   ============================================================ */

export function genArrowPath(x: number, y: number, w: number, h: number): string {
  const bodyH = h * 0.4;
  const bodyW = w * 0.65;
  const bodyY = y + (h - bodyH) / 2;
  return [
    `M ${round(x)} ${round(bodyY)}`,
    `L ${round(x + bodyW)} ${round(bodyY)}`,
    `L ${round(x + bodyW)} ${round(y)}`,
    `L ${round(x + w)} ${round(y + h / 2)}`,
    `L ${round(x + bodyW)} ${round(y + h)}`,
    `L ${round(x + bodyW)} ${round(bodyY + bodyH)}`,
    `L ${round(x)} ${round(bodyY + bodyH)} Z`,
  ].join(' ');
}

export function genHeartPath(x: number, y: number, w: number, h: number): string {
  const cx = x + w / 2;
  return [
    `M ${round(cx)} ${round(y + h)}`,
    `C ${round(x + w * 0.30)} ${round(y + h * 0.70)} ${round(x + w * 0.05)} ${round(y + h * 0.40)} ${round(x + w * 0.15)} ${round(y + h * 0.20)}`,
    `C ${round(x + w * 0.25)} ${round(y + h * 0.00)} ${round(cx)}          ${round(y + h * 0.05)} ${round(cx)}          ${round(y + h * 0.30)}`,
    `C ${round(cx)}          ${round(y + h * 0.05)} ${round(x + w * 0.75)} ${round(y + h * 0.00)} ${round(x + w * 0.85)} ${round(y + h * 0.20)}`,
    `C ${round(x + w * 0.95)} ${round(y + h * 0.40)} ${round(x + w * 0.70)} ${round(y + h * 0.70)} ${round(cx)}          ${round(y + h)} Z`,
  ].join(' ');
}

export function genCrossPath(x: number, y: number, w: number, h: number): string {
  const t = Math.min(w, h) * 0.33;
  const ht = t / 2;
  const cx = x + w / 2, cy = y + h / 2;
  return [
    `M ${round(cx - ht)} ${round(y)}`,
    `L ${round(cx + ht)} ${round(y)}`,
    `L ${round(cx + ht)} ${round(cy - ht)}`,
    `L ${round(x + w)}   ${round(cy - ht)}`,
    `L ${round(x + w)}   ${round(cy + ht)}`,
    `L ${round(cx + ht)} ${round(cy + ht)}`,
    `L ${round(cx + ht)} ${round(y + h)}`,
    `L ${round(cx - ht)} ${round(y + h)}`,
    `L ${round(cx - ht)} ${round(cy + ht)}`,
    `L ${round(x)}       ${round(cy + ht)}`,
    `L ${round(x)}       ${round(cy - ht)}`,
    `L ${round(cx - ht)} ${round(cy - ht)} Z`,
  ].join(' ');
}

export function genSpeechPath(x: number, y: number, w: number, h: number): string {
  const bubbleH = h * 0.78;
  const r = Math.min(w, bubbleH) * 0.18;
  const tailW = w * 0.16;
  const tailX = x + w * 0.22;
  return [
    `M ${round(x + r)} ${round(y)}`,
    `L ${round(x + w - r)} ${round(y)}`,
    `Q ${round(x + w)} ${round(y)} ${round(x + w)} ${round(y + r)}`,
    `L ${round(x + w)} ${round(y + bubbleH - r)}`,
    `Q ${round(x + w)} ${round(y + bubbleH)} ${round(x + w - r)} ${round(y + bubbleH)}`,
    `L ${round(tailX + tailW)} ${round(y + bubbleH)}`,
    `L ${round(tailX)}          ${round(y + h)}`,
    `L ${round(tailX)}          ${round(y + bubbleH)}`,
    `L ${round(x + r)}          ${round(y + bubbleH)}`,
    `Q ${round(x)} ${round(y + bubbleH)} ${round(x)} ${round(y + bubbleH - r)}`,
    `L ${round(x)} ${round(y + r)}`,
    `Q ${round(x)} ${round(y)} ${round(x + r)} ${round(y)} Z`,
  ].join(' ');
}

/* ============================================================
   BUILD SHAPE FROM DRAG
   ============================================================ */

const PATH_SHAPES = {
  arrow:  { gen: genArrowPath,  label: 'Arrow'  },
  heart:  { gen: genHeartPath,  label: 'Heart'  },
  cross:  { gen: genCrossPath,  label: 'Cross'  },
  speech: { gen: genSpeechPath, label: 'Speech' },
} as const;

const POLY_SHAPES: Record<string, { sides: number; label: string }> = {
  triangle: { sides: 3, label: 'Triangle' },
  diamond:  { sides: 4, label: 'Diamond'  },
  hexagon:  { sides: 6, label: 'Hexagon'  },
  octagon:  { sides: 8, label: 'Octagon'  },
};

export function buildShapeFromDrag(tool: ToolId, p0: Point, p1: Point): SvgElement | null {
  const x = Math.min(p0.x, p1.x), y = Math.min(p0.y, p1.y);
  const w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
  const base = styleAttrs();
  const ww = Math.max(1, w), hh = Math.max(1, h);

  /* ---- Basic shapes ---- */
  if (tool === 'rect') {
    return makeElement('rect', {
      ...base, x: round(x), y: round(y),
      width: round(ww), height: round(hh),
    });
  }

  if (tool === 'ellipse') {
    return makeElement('ellipse', {
      ...base,
      cx: round(x + ww / 2), cy: round(y + hh / 2),
      rx: round(Math.max(0.5, ww / 2)), ry: round(Math.max(0.5, hh / 2)),
    });
  }

  if (tool === 'line') {
    const a: Record<string, any> = { ...base };
    if (a.fill) a.fill = 'none';
    a.stroke = state.style.strokeNone ? CONFIG.defaultStroke : state.style.stroke;
    a['stroke-width'] = state.style.strokeWidth > 0 ? state.style.strokeWidth : 2;
    return makeElement('line', {
      ...a, x1: round(p0.x), y1: round(p0.y), x2: round(p1.x), y2: round(p1.y),
    });
  }

  if (tool === 'star') {
    const el = makeElement('polygon', {
      ...base,
      points: starPointsStr(x + ww / 2, y + hh / 2, ww / 2, hh / 2, 5, true, 0.45),
    });
    el.meta.sides = 5;
    el.meta.star = true;
    return el;
  }

  /* ---- Polygon-based shapes (Triangle, Diamond, Hexagon, Octagon) ---- */
  if (tool in POLY_SHAPES) {
    const { sides, label } = POLY_SHAPES[tool as string];
    const el = makeElement('polygon', {
      ...base,
      points: starPointsStr(x + ww / 2, y + hh / 2, ww / 2, hh / 2, sides, false, 1),
    });
    el.meta.sides = sides;
    el.meta.star = false;
    el.name = label;
    return el;
  }

  /* ---- Path-based shapes (Arrow, Heart, Cross, Speech) ---- */
  if (tool in PATH_SHAPES) {
    const { gen, label } = PATH_SHAPES[tool as keyof typeof PATH_SHAPES];
    const d = gen(x, y, ww, hh);
    const el = makeElement('path', { ...base, d });
    el.meta.cmds = parsePathData(d);
    el.name = label;
    return el;
  }

  return null;
}

export function startCreate(_e: PointerEvent, pt: Point) {
  setDrag({ type: 'create', tool: state.tool, start: pt, cur: pt });
  renderOverlay();
}

void typeLabel;