import type { SvgElement } from '../types';
import { round } from '../utils/math';
import { escAttr, escText } from '../utils/dom';

export function elementToSVGString(el: SvgElement): string {
  const a: Record<string, any> = {};
  for (const k in el.attrs) {
    const v = el.attrs[k];
    if (v === null || v === undefined || v === '') continue;
    a[k] = v;
  }
  const rot = el.meta.rotation || 0;
  if (Math.abs(rot) > 0.001 && el.meta.pivot) {
    a.transform = `rotate(${round(rot)} ${round(el.meta.pivot.x)} ${round(el.meta.pivot.y)})`;
  }
  let s = '<' + el.type;
  for (const k in a) s += ` ${k}="${escAttr(a[k])}"`;
  if (el.type === 'text') s += '>' + escText(el.text || '') + '</text>';
  else s += '/>';
  return s;
}