// Select-tool helpers used by input/pointer.ts
import type { SvgElement } from '../types';
import { state, setDrag, getElById, selectedEls } from '../core/state';
import { getBBoxOf } from '../geometry/bbox';
import { toCanvas } from '../render/overlay';

export function startMove(e: PointerEvent) {
  const start = toCanvas(e);
  const orig = state.selection.map(id => {
    const el = getElById(id);
    if (!el || el.locked) return null;
    return {
      el,
      attrs: JSON.parse(JSON.stringify(el.attrs)),
      pivot: el.meta.pivot ? { x: el.meta.pivot.x, y: el.meta.pivot.y } : null,
    };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  if (!orig.length) return;
  setDrag({ type: 'move', start, orig, moved: false });
}

export function startResize(e: PointerEvent, el: SvgElement, key: string) {
  if (el.locked) return;
  const b = getBBoxOf(el);
  if (!b) return;
  const rot = el.meta.rotation || 0;
  const pivot = el.meta.pivot || { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  setDrag({
    type: 'resize', el, key,
    box0: { x: b.x, y: b.y, width: b.width, height: b.height },
    pivot, rot,
    orig: JSON.parse(JSON.stringify(el.attrs)),
  });
}

export function startRotate(e: PointerEvent, el: SvgElement) {
  if (el.locked) return;
  const b = getBBoxOf(el);
  if (!b) return;
  if (!el.meta.pivot) el.meta.pivot = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const pt = toCanvas(e);
  const startAngle = Math.atan2(pt.y - el.meta.pivot.y, pt.x - el.meta.pivot.x) * 180 / Math.PI;
  setDrag({
    type: 'rotate', el,
    pivot: { x: el.meta.pivot.x, y: el.meta.pivot.y },
    startAngle,
    rot0: el.meta.rotation || 0,
  });
}

export function startMarquee(e: PointerEvent, pt: { x: number; y: number }) {
  setDrag({
    type: 'marquee', start: pt, cur: pt,
    add: e.shiftKey, base: state.selection.slice(),
  });
}

export { selectedEls };