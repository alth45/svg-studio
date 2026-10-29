import type { SvgElement, ElementType, ElementMeta } from '../types';
import { uid } from '../utils/id';

const LABELS: Record<string, string> = {
  rect: 'Rectangle', ellipse: 'Ellipse', line: 'Line',
  polygon: 'Polygon', path: 'Path', text: 'Text',
  // Shape-kind labels (used when we override el.name)
  triangle: 'Triangle', diamond: 'Diamond', hexagon: 'Hexagon', octagon: 'Octagon',
  arrow: 'Arrow', heart: 'Heart', cross: 'Cross', speech: 'Speech',
};

export function typeLabel(type: ElementType | string): string {
  return LABELS[type] || String(type);
}

export function makeElement(
  type: ElementType, attrs: Record<string, any>, name?: string,
): SvgElement {
  const meta: ElementMeta = { rotation: 0, pivot: null, sides: 5, star: true, cmds: null };
  return {
    id: uid(), type,
    name: name || typeLabel(type),
    locked: false, hidden: false,
    meta, attrs,
    text: type === 'text' ? 'Text' : undefined,
  };
}