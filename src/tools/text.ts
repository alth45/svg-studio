import { state } from '../core/state';
import { makeElement } from '../model/factory';
import { styleAttrs } from '../model/style';
import { round } from '../utils/math';
import type { Point } from '../types';

export function createTextAt(pt: Point) {
  const a: Record<string, any> = styleAttrs();
  a.x = round(pt.x);
  a.y = round(pt.y);
  a['font-family'] = 'Inter, system-ui, sans-serif';
  a['font-size'] = 24;
  a['font-weight'] = 400;
  a['dominant-baseline'] = 'hanging';
  if (!a.fill || a.fill === 'none') a.fill = '#333333';
  a.stroke = 'none';

  const el = makeElement('text', a);
  el.text = 'Text';
  return el;
}