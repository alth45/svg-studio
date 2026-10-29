/* ============================================================
 * core/state.ts — Global application state
 * ============================================================ */

import type { AppState, SvgElement } from '../types';
import { CONFIG, DEFAULT_STYLE } from '../config';

export const state: AppState = {
  docName: 'Untitled',
  canvas: { width: CONFIG.canvas.width, height: CONFIG.canvas.height },
  elements: [],
  selection: [],
  tool: 'select',
  zoom: 1,
  pan: { x: 0, y: 0 },
  showGrid: true,
  nextId: 1,
  pathDraft: null,
  nodeEditId: null,
  nodeSel: null,
  style: { ...DEFAULT_STYLE },
  groupNames: {},
};

/* ---- Active drag state (set by input layer) ---- */
export let drag: any = null;
export function setDrag(d: any) { drag = d; }

export let spaceDown = false;
export function setSpaceDown(v: boolean) { spaceDown = v; }

/* ---- Lookup helpers ---- */
export function getElById(id: string): SvgElement | null {
  return state.elements.find(e => e.id === id) || null;
}

export function firstSel(): SvgElement | null {
  return state.selection.length ? getElById(state.selection[0]) : null;
}

export function selectedEls(): SvgElement[] {
  return state.selection
    .map(getElById)
    .filter((e): e is SvgElement => !!e);
}

export function getGroupMembers(el: SvgElement): string[] {
  if (!el.groupId) return [el.id];
  return state.elements
    .filter(x => x.groupId === el.groupId)
    .map(x => x.id);
}