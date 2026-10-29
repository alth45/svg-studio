/* ============================================================
 * input/keyboard.ts — Keyboard shortcuts
 * ============================================================ */

import { state, selectedEls, setSpaceDown } from '../core/state';
import { pushHistory, undo, redo } from '../core/history';
import { TOOL_KEYS } from '../config';
import { translateAttrs } from '../geometry/transforms';
import {
  renderLive, renderAll, deleteSelection, duplicateSelection, setTool, addElement,
  copySelection, cutSelection, paste,
  groupSelection, ungroupSelection,
  bringToFront, sendToBack,
  renameSelection,
} from '../app';
import { finishPath } from '../tools/pen';
import { parsePathData, buildPathData } from '../utils/path';
import { downloadSVG } from '../io/exporter';

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return !!el && (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.isContentEditable
  );
};

export function bindKeyboard() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isTyping(e.target)) {
      setSpaceDown(true);
      (document.getElementById('stage') as HTMLElement).style.cursor = 'grab';
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      setSpaceDown(false);
      if (state.tool !== 'hand') {
        (document.getElementById('stage') as HTMLElement).style.cursor = 'default';
      }
    }
  });
  document.addEventListener('keydown', onKeyDown);
}

function onKeyDown(e: KeyboardEvent) {
  if (isTyping(e.target)) return;
  const ctrl = e.ctrlKey || e.metaKey;
  const key = e.key;

  /* ================ Ctrl / Cmd ================ */
  if (ctrl) {
    const k = key.toLowerCase();

    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(renderAll); return; }
    if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(renderAll); return; }

    if (k === 'd') { e.preventDefault(); duplicateSelection(); return; }
    if (k === 'c') { e.preventDefault(); copySelection(); return; }
    if (k === 'x') { e.preventDefault(); cutSelection(); return; }
    if (k === 'v') { e.preventDefault(); paste(); return; }

    if (k === 'g' && e.shiftKey) { e.preventDefault(); ungroupSelection(); return; }
    if (k === 'g') { e.preventDefault(); groupSelection(); return; }

    if (k === ']') { e.preventDefault(); bringToFront(); return; }
    if (k === '[') { e.preventDefault(); sendToBack(); return; }

    if (k === 'a') {
      e.preventDefault();
      state.selection = state.elements
        .filter(el => !el.hidden && !el.locked)
        .map(el => el.id);
      renderAll();
      return;
    }
    if (k === 's') { e.preventDefault(); downloadSVG(); return; }
    return;
  }

  /* ================ Escape ================ */
  if (key === 'Escape') {
    if (state.pathDraft) {
      const el = finishPath(false);
      if (el) addElement(el);
      return;
    }
    if (state.nodeEditId) {
      state.nodeEditId = null;
      state.nodeSel = null;
      renderAll();
      return;
    }
    state.selection = [];
    renderAll();
    return;
  }

  /* ================ Enter (close path) ================ */
  if (key === 'Enter' && state.pathDraft) {
    e.preventDefault();
    const el = finishPath(true);
    if (el) addElement(el);
    return;
  }

  /* ================ Delete / Backspace ================ */
  if (key === 'Delete' || key === 'Backspace') {
    e.preventDefault();
    if (state.nodeEditId && state.nodeSel) {
      const el = selectedEls()[0];
      if (el && el.meta.cmds) {
        const cmds = JSON.parse(JSON.stringify(el.meta.cmds));
        const ci = state.nodeSel.ci;
        if (cmds[ci] && cmds[ci].c !== 'M') {
          cmds.splice(ci, 1);
          el.meta.cmds = cmds;
          el.attrs.d = buildPathData(cmds);
          state.nodeSel = null;
          pushHistory();
          renderAll();
        }
      }
      return;
    }
    deleteSelection();
    return;
  }

  /* ================ Arrow keys ================ */
  if (key.startsWith('Arrow') && state.selection.length) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (key === 'ArrowLeft') dx = -step;
    if (key === 'ArrowRight') dx = step;
    if (key === 'ArrowUp') dy = -step;
    if (key === 'ArrowDown') dy = step;

    selectedEls().forEach(el => {
      if (el.locked) return;
      el.attrs = translateAttrs(el.attrs, el.type, dx, dy);
      if (el.meta.pivot) {
        el.meta.pivot.x += dx;
        el.meta.pivot.y += dy;
      }
      if (el.meta.cmds) el.meta.cmds = null;
    });
    renderLive();
    clearTimeout((window as any).__arrowTimer);
    (window as any).__arrowTimer = setTimeout(() => {
      pushHistory();
      renderAll();
    }, 350);
    return;
  }

  /* ================ F2 — Rename ================ */
  if (key === 'F2' && state.selection.length) {
    e.preventDefault();
    renameSelection();
    return;
  }

  /* ================ Tool shortcuts ================ */
  const lower = key.toLowerCase();
  if (TOOL_KEYS[lower]) {
    e.preventDefault();
    setTool(TOOL_KEYS[lower] as any);
    return;
  }

  /* expose parsePathData untuk dblclick handler */
  (window as any).parsePathData = parsePathData;
}