import type { SvgElement } from '../types';
import { createSVG, $ } from '../utils/dom';

export function buildNode(el: SvgElement): SVGElement {
  let node: SVGElement;
  switch (el.type) {
    case 'rect':    node = createSVG('rect'); break;
    case 'ellipse': node = createSVG('ellipse'); break;
    case 'line':    node = createSVG('line'); break;
    case 'polygon': node = createSVG('polygon'); break;
    case 'path':    node = createSVG('path'); break;
    case 'text':    node = createSVG('text'); break;
    default:        node = createSVG('g');
  }
  for (const k in el.attrs) {
    const v = el.attrs[k];
    if (v === null || v === undefined || v === '') continue;
    node.setAttribute(k, String(v));
  }
  if (el.type === 'text') node.textContent = el.text || '';
  const r = el.meta.rotation || 0;
  if (Math.abs(r) > 0.001 && el.meta.pivot) {
    node.setAttribute('transform',
      `rotate(${Math.round(r * 100) / 100} ${el.meta.pivot.x} ${el.meta.pivot.y})`);
  } else {
    node.removeAttribute('transform');
  }
  return node;
}

import { state } from '../core/state';
export function renderContent() {
  const g = $('#content');
  g.innerHTML = '';
  for (const el of state.elements) {
    if (el.hidden) continue;
    const node = buildNode(el);
    node.setAttribute('data-id', el.id);
    if (el.locked) (node as SVGElement).style.pointerEvents = 'none';
    g.appendChild(node);
  }
}