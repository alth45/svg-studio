import { NS } from '../config';

export function createSVG(tag: string, attrs?: Record<string, any>): SVGElement {
  const n = document.createElementNS(NS, tag) as SVGElement;
  if (attrs) for (const k in attrs) {
    if (attrs[k] === null || attrs[k] === undefined) continue;
    n.setAttribute(k, String(attrs[k]));
  }
  return n;
}

export const $ = <T extends Element = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as T;
export const $$ = <T extends Element = HTMLElement>(sel: string): T[] =>
  Array.from(document.querySelectorAll(sel)) as T[];

export function escAttr(v: any): string {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                  .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function escText(v: any): string {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}