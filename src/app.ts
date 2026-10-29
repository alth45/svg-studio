/* ============================================================
 * app.ts — Composition root: render pipeline + operations
 * ============================================================ */

import type { ToolId, SvgElement } from './types';
import {
  state, getElById, selectedEls, getGroupMembers,
} from './core/state';
import { pushHistory } from './core/history';
import { CONFIG } from './config';
import { translateAttrs, scaleAttrs } from './geometry/transforms';
import { parsePathData, buildPathData } from './utils/path';
import { renderContent } from './render/canvas';
import { renderOverlay } from './render/overlay';
import { renderGrid, updateCanvasSize } from './render/grid';
import { updateViewport, zoomToFit } from './render/viewport';
import { buildToolbar, highlightTool } from './ui/toolbar';
import { bindTopbar } from './ui/topbar';
import { bindStatusbar, updateStatus } from './ui/statusbar';
import { bindInspector, updateInspector, syncInspectorValues } from './ui/inspector';
import { renderLayers } from './ui/layers';
import { bindPointer } from './input/pointer';
import { bindKeyboard } from './input/keyboard';
import { bindWheelZoom } from './input/zoom';
import { bindContextMenu } from './ui/contextMenu';
import { makeElement } from './model/factory';
import { toast } from './tools/toast';

/* ---- Expose helpers untuk sub-module (hindari circular runtime) ---- */
(window as any).__scaleAttrs = scaleAttrs;
(window as any).__buildPathData = buildPathData;
(window as any).__updateViewport = updateViewport;
(window as any).__zoomToFit = zoomToFit;
(window as any).parsePathData = parsePathData;

/* ============================================================
 * RENDER PIPELINE
 * ============================================================ */
export function renderAll() {
  renderContent();
  renderOverlay();
  renderLayers();
  updateInspector();
  updateStatus();
  (window as any).__refreshHistory?.();
}

export function renderLive() {
  renderContent();
  renderOverlay();
  syncInspectorValues();
}

/* ============================================================
 * ELEMENT CRUD
 * ============================================================ */
export function addElement(el: SvgElement) {
  state.elements.push(el);
  state.selection = [el.id];
  state.nodeEditId = null;
  pushHistory();
  renderAll();
  toast(el.name + ' ditambahkan');
}

export function deleteSelection() {
  if (!state.selection.length) return;
  state.elements = state.elements.filter(e => !state.selection.includes(e.id));
  state.selection = [];
  state.nodeEditId = null;
  state.nodeSel = null;
  pushHistory();
  renderAll();
}

export function duplicateSelection() {
  if (!state.selection.length) return;
  const copies: SvgElement[] = [];
  const groupMap = new Map<string, string>();

  state.selection.forEach(id => {
    const src = getElById(id);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src)) as SvgElement;
    copy.id = `el_${state.nextId++}`;
    copy.name = src.name + ' copy';
    copy.attrs = translateAttrs(copy.attrs, copy.type, 16, 16);
    if (copy.meta.pivot) {
      copy.meta.pivot = {
        x: copy.meta.pivot.x + 16,
        y: copy.meta.pivot.y + 16,
      };
    }
    if (copy.groupId) {
      if (!groupMap.has(copy.groupId)) {
        const newGid = `grp_${state.nextId++}`;
        groupMap.set(copy.groupId, newGid);
        state.groupNames[newGid] =
          (state.groupNames[copy.groupId] || 'Group') + ' copy';
      }
      copy.groupId = groupMap.get(copy.groupId);
    }
    copies.push(copy);
  });

  if (!copies.length) return;
  state.elements.push(...copies);
  state.selection = copies.map(c => c.id);
  pushHistory();
  renderAll();
  toast('Duplicated');
}

/* ============================================================
 * CLIPBOARD (in-memory — excluded from history)
 * ============================================================ */
let clipboard: SvgElement[] = [];
let pasteCount = 0;

export function copySelection() {
  const sels = selectedEls();
  if (!sels.length) return;
  clipboard = JSON.parse(JSON.stringify(sels));
  pasteCount = 0;
  toast(`Copied ${clipboard.length} element(s)`);
}

export function cutSelection() {
  copySelection();
  deleteSelection();
}

export function paste() {
  if (!clipboard.length) return;
  pasteCount++;
  const offset = 20 * pasteCount;
  const groupMap = new Map<string, string>();
  const copies: SvgElement[] = [];

  clipboard.forEach(src => {
    const copy = JSON.parse(JSON.stringify(src)) as SvgElement;
    copy.id = `el_${state.nextId++}`;
    copy.name = src.name + ' copy';
    copy.attrs = translateAttrs(copy.attrs, copy.type, offset, offset);
    if (copy.meta.pivot) {
      copy.meta.pivot = {
        x: copy.meta.pivot.x + offset,
        y: copy.meta.pivot.y + offset,
      };
    }
    if (copy.groupId) {
      if (!groupMap.has(copy.groupId)) {
        const newGid = `grp_${state.nextId++}`;
        groupMap.set(copy.groupId, newGid);
        state.groupNames[newGid] =
          (state.groupNames[copy.groupId] || 'Group') + ' copy';
      }
      copy.groupId = groupMap.get(copy.groupId);
    }
    copies.push(copy);
  });

  state.elements.push(...copies);
  state.selection = copies.map(c => c.id);
  pushHistory();
  renderAll();
  toast(`Pasted ${copies.length} element(s)`);
}

export function hasClipboard(): boolean {
  return clipboard.length > 0;
}

/* ============================================================
 * GROUPING
 * ============================================================ */
export function groupSelection() {
  if (state.selection.length < 2) return;
  const newGid = `grp_${state.nextId++}`;

  let n = 1;
  while (Object.values(state.groupNames).includes(`Group ${n}`)) n++;
  state.groupNames[newGid] = `Group ${n}`;

  state.selection.forEach(id => {
    const el = getElById(id);
    if (el) el.groupId = newGid;
  });

  pushHistory();
  renderAll();
  toast(`Grouped ${state.selection.length} elements`);
}

export function ungroupSelection() {
  const affected = new Set<string>();
  state.selection.forEach(id => {
    const el = getElById(id);
    if (el?.groupId) affected.add(el.groupId);
  });
  if (!affected.size) return;

  affected.forEach(gid => {
    state.elements.forEach(e => {
      if (e.groupId === gid) delete e.groupId;
    });
    delete state.groupNames[gid];
  });

  pushHistory();
  renderAll();
  toast('Ungrouped');
}

/* ============================================================
 * Z-ORDER
 * ============================================================ */
export function bringToFront() {
  if (!state.selection.length) return;
  const s = new Set(state.selection);
  const moved = state.elements.filter(e => s.has(e.id));
  const rest = state.elements.filter(e => !s.has(e.id));
  state.elements = [...rest, ...moved];
  pushHistory();
  renderAll();
}

export function sendToBack() {
  if (!state.selection.length) return;
  const s = new Set(state.selection);
  const moved = state.elements.filter(e => s.has(e.id));
  const rest = state.elements.filter(e => !s.has(e.id));
  state.elements = [...moved, ...rest];
  pushHistory();
  renderAll();
}

export function bringForward() {
  if (!state.selection.length) return;
  const s = new Set(state.selection);
  for (let i = state.elements.length - 2; i >= 0; i--) {
    if (s.has(state.elements[i].id) && !s.has(state.elements[i + 1].id)) {
      [state.elements[i], state.elements[i + 1]] =
        [state.elements[i + 1], state.elements[i]];
    }
  }
  pushHistory();
  renderAll();
}

export function sendBackward() {
  if (!state.selection.length) return;
  const s = new Set(state.selection);
  for (let i = 1; i < state.elements.length; i++) {
    if (s.has(state.elements[i].id) && !s.has(state.elements[i - 1].id)) {
      [state.elements[i], state.elements[i - 1]] =
        [state.elements[i - 1], state.elements[i]];
    }
  }
  pushHistory();
  renderAll();
}

/* ============================================================
 * LOCK / HIDE / RENAME
 * ============================================================ */
export function toggleLock() {
  const sels = selectedEls();
  if (!sels.length) return;
  const target = !sels[0].locked;
  sels.forEach(el => { el.locked = target; });
  pushHistory();
  renderAll();
}

export function toggleHide() {
  const sels = selectedEls();
  if (!sels.length) return;
  const target = !sels[0].hidden;
  sels.forEach(el => { el.hidden = target; });
  pushHistory();
  renderAll();
}

export function renameSelection() {
  const sels = selectedEls();
  if (!sels.length) return;
  const el = sels[0];

  if (el.groupId) {
    const current = state.groupNames[el.groupId] || 'Group';
    const nn = prompt('Rename group:', current);
    if (nn !== null && nn.trim()) {
      state.groupNames[el.groupId] = nn.trim();
      pushHistory();
      renderAll();
    }
  } else {
    const nn = prompt('Rename layer:', el.name);
    if (nn !== null && nn.trim()) {
      el.name = nn.trim();
      pushHistory();
      renderAll();
    }
  }
}

/* ============================================================
 * TOOL SWITCH
 * ============================================================ */
export function setTool(id: ToolId) {
  if (state.tool === 'pen' && id !== 'pen' && state.pathDraft) {
    const d = state.pathDraft;
    state.pathDraft = null;
    if (d.points.length >= 2) {
      import('./tools/pen').then(({ finishPath }) => {
        const el = finishPath(false);
        if (el) addElement(el);
      });
    }
  }
  state.tool = id;
  state.nodeEditId = null;
  highlightTool(id);

  const cursors: Record<ToolId, string> = {
    select: 'default', hand: 'grab',
    rect: 'crosshair', ellipse: 'crosshair', line: 'crosshair',
    star: 'crosshair', triangle: 'crosshair', diamond: 'crosshair',
    hexagon: 'crosshair', octagon: 'crosshair',
    arrow: 'crosshair', heart: 'crosshair', cross: 'crosshair', speech: 'crosshair',
    pen: 'crosshair', text: 'text',
  };
  (document.getElementById('stage') as HTMLElement).style.cursor =
    cursors[id] || 'default';
  updateStatus();
  renderOverlay();
}

/* ============================================================
 * BOOT
 * ============================================================ */
export function boot() {
  buildToolbar(setTool);
  setTool('select');
  bindTopbar();
  bindStatusbar();
  bindInspector();
  bindPointer();
  bindKeyboard();
  bindWheelZoom();
  bindContextMenu();

  updateCanvasSize();
  updateViewport();
  renderGrid();

  /* Sample content */
  const r = makeElement('rect', {
    x: 140, y: 140, width: 260, height: 160,
    fill: CONFIG.defaultFill, stroke: 'none', rx: 16, ry: 16,
  });
  r.name = 'Rectangle 1';

  const t = makeElement('text', {
    x: 140, y: 340,
    'font-family': 'Inter, system-ui, sans-serif',
    'font-size': 40, 'font-weight': 700,
    fill: '#1e1e1e', stroke: 'none',
    'dominant-baseline': 'hanging',
  });
  t.text = 'Hello SVG';
  t.name = 'Text 1';

  state.elements.push(r, t);
  state.selection = [];

  pushHistory();
  renderAll();

  requestAnimationFrame(() => {
    zoomToFit();
    renderAll();
  });
}

/* Silence unused-import warnings */
void getGroupMembers;