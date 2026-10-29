import type { BBox, SvgElement } from '../types';
import { rotPoint } from './transforms';
import { $ } from '../utils/dom';

export function getNode(id: string): Element | null {
  return document.querySelector(`#content [data-id="${id}"]`);
}

export function getBBoxOf(el: SvgElement): BBox | null {
  const node = getNode(el.id);
  if (!node) return null;
  try {
    const b = (node as SVGGraphicsElement).getBBox();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  } catch { return null; }
}

export function unionBBox(els: SvgElement[]): BBox | null {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity, any = false;
  for (const el of els) {
    const b = getBBoxOf(el);
    if (!b) continue;
    any = true;
    let corners = [
      { x: b.x, y: b.y }, { x: b.x + b.width, y: b.y },
      { x: b.x, y: b.y + b.height }, { x: b.x + b.width, y: b.y + b.height },
    ];
    if (Math.abs(el.meta.rotation || 0) > 0.001 && el.meta.pivot) {
      corners = corners.map(c => rotPoint(c, el.meta.pivot!, el.meta.rotation));
    }
    for (const c of corners) {
      x1 = Math.min(x1, c.x); y1 = Math.min(y1, c.y);
      x2 = Math.max(x2, c.x); y2 = Math.max(y2, c.y);
    }
  }
  return any ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : null;
}