import type { Point, BBox, ElementType } from '../types';
import { round } from '../utils/math';
import { applyMatrixToPath } from '../utils/path';

export function rotPoint(p: Point, pivot: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = p.x - pivot.x, dy = p.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

export function translateAttrs(
  a: Record<string, any>, type: ElementType, dx: number, dy: number
): Record<string, any> {
  const n = { ...a };
  switch (type) {
    case 'rect':    n.x = a.x + dx; n.y = a.y + dy; break;
    case 'ellipse': n.cx = a.cx + dx; n.cy = a.cy + dy; break;
    case 'line':    n.x1 = a.x1 + dx; n.y1 = a.y1 + dy; n.x2 = a.x2 + dx; n.y2 = a.y2 + dy; break;
    case 'text':    n.x = a.x + dx; n.y = a.y + dy; break;
    case 'polygon': n.points = shiftPoints(a.points, dx, dy); break;
    case 'path':    n.d = applyMatrixToPath(a.d, { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy }); break;
  }
  return n;
}

export function shiftPoints(str: string, dx: number, dy: number): string {
  const nums = String(str || '').match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const out: string[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push(round(parseFloat(nums[i]) + dx) + ',' + round(parseFloat(nums[i+1]) + dy));
  }
  return out.join(' ');
}

export function scaleAttrs(
  a: Record<string, any>, type: ElementType, b0: BBox, b1: BBox
): Record<string, any> {
  const sx = b0.width > 0.0001 ? b1.width / b0.width : 1;
  const sy = b0.height > 0.0001 ? b1.height / b0.height : 1;
  const mx = (v: number) => b1.x + (v - b0.x) * sx;
  const my = (v: number) => b1.y + (v - b0.y) * sy;
  const n = { ...a };

  switch (type) {
    case 'rect':
      n.x = mx(a.x); n.y = my(a.y);
      n.width = Math.max(0.5, a.width * sx);
      n.height = Math.max(0.5, a.height * sy);
      if (a.rx) n.rx = Math.max(0, a.rx * Math.min(sx, sy));
      if (a.ry) n.ry = Math.max(0, a.ry * Math.min(sx, sy));
      break;
    case 'ellipse':
      n.cx = mx(a.cx); n.cy = my(a.cy);
      n.rx = Math.max(0.5, a.rx * Math.abs(sx));
      n.ry = Math.max(0.5, a.ry * Math.abs(sy));
      break;
    case 'line':
      n.x1 = mx(a.x1); n.y1 = my(a.y1);
      n.x2 = mx(a.x2); n.y2 = my(a.y2);
      break;
    case 'text':
      n.x = mx(a.x); n.y = my(a.y);
      n['font-size'] = Math.max(1, (parseFloat(a['font-size']) || 24) * Math.abs(sy));
      break;
    case 'polygon': {
      const nums = String(a.points || '').match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
      const out: string[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        out.push(round(mx(parseFloat(nums[i]))) + ',' + round(my(parseFloat(nums[i+1]))));
      }
      n.points = out.join(' ');
      break;
    }
    case 'path':
      n.d = applyMatrixToPath(a.d, {
        a: sx, b: 0, c: 0, d: sy,
        e: b1.x - b0.x * sx,
        f: b1.y - b0.y * sy,
      });
      break;
  }
  return n;
}