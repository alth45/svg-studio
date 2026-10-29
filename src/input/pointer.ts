/* ============================================================
 * input/pointer.ts — Pointer + context menu + smart guides
 * ============================================================ */

import {
  state, drag, setDrag, spaceDown,
  getElById, selectedEls, firstSel, getGroupMembers,
} from '../core/state';
import { pushHistory } from '../core/history';
import { toCanvas, renderOverlay } from '../render/overlay';
import { startPan } from '../tools/hand';
import { startMove, startResize, startRotate, startMarquee } from '../tools/select';
import { startCreate, buildShapeFromDrag } from '../tools/create';
import { penClick } from '../tools/pen';
import { createTextAt } from '../tools/text';
import { translateAttrs, rotPoint } from '../geometry/transforms';
import { unionBBox, getBBoxOf } from '../geometry/bbox';
import { CONFIG } from '../config';
import { computeSnap, snapResize, renderGuides } from '../features/smartGuides';
import type { BBox } from '../types';
import {
  renderLive, renderAll, addElement, setTool,
  deleteSelection, duplicateSelection,
  copySelection, cutSelection, paste, hasClipboard,
  groupSelection, ungroupSelection,
  bringToFront, bringForward, sendBackward, sendToBack,
  toggleLock, toggleHide, renameSelection,
} from '../app';
import { showContextMenu, hideContextMenu, MenuItem } from '../ui/contextMenu';

export function bindPointer() {
  const stage = document.getElementById('stage')!;
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('contextmenu', onContextMenu);

  stage.addEventListener('dblclick', (e) => {
    const holder = (e.target as Element).closest?.('[data-id]');
    if (!holder) return;
    const el = getElById(holder.getAttribute('data-id')!);
    if (!el) return;
    if (el.type === 'text') {
      state.selection = [el.id];
      renderAll();
      const ta = document.getElementById('textContent') as HTMLTextAreaElement;
      ta?.focus();
      ta?.select();
    } else if (el.type === 'path') {
      state.selection = [el.id];
      state.nodeEditId = el.id;
      el.meta.cmds = parsePathDataSafe(el.attrs.d as string);
      renderAll();
    }
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    (window as any).__setZoomFromWheel?.(e);
  }, { passive: false });
}

function parsePathDataSafe(d: string) {
  return ((window as any).parsePathData as (s: string) => any)?.(d) ?? null;
}

/* ============================================================
 * Helper: kumpulan ID yang harus dikecualikan dari snapping
 * (selection + semua member grup yang terpilih)
 * ============================================================ */
function getExcludedIds(): Set<string> {
  const ids = new Set(state.selection);
  const groupIds = new Set<string>();
  state.selection.forEach(id => {
    const el = getElById(id);
    if (el?.groupId) groupIds.add(el.groupId);
  });
  if (groupIds.size) {
    for (const el of state.elements) {
      if (el.groupId && groupIds.has(el.groupId)) ids.add(el.id);
    }
  }
  return ids;
}

/* ============================================================
 * POINTER DOWN
 * ============================================================ */
function onPointerDown(e: PointerEvent) {
  if (e.button === 1 || spaceDown || state.tool === 'hand') {
    e.preventDefault();
    startPan(e);
    return;
  }
  if (e.button !== 0) return;

  const pt = toCanvas(e);
  const target = e.target as Element;

  if (target.hasAttribute('data-handle')) {
    const el = getElById(target.getAttribute('data-elid')!);
    if (el) { startResize(e, el, target.getAttribute('data-handle')!); return; }
  }
  if (target.tagName === 'circle') {
    const parentG = target.parentElement;
    if (parentG && parentG.parentElement?.id === 'overlay') {
      const el = firstSel();
      if (el) { startRotate(e, el); return; }
    }
  }
  if (target.hasAttribute('data-nodeci')) {
    const el = getElById(target.getAttribute('data-elid')!);
    if (el && el.meta.cmds) {
      const ci = parseInt(target.getAttribute('data-nodeci')!, 10);
      const pi = parseInt(target.getAttribute('data-nodepi')!, 10);
      state.nodeSel = { ci, pi };
      setDrag({
        type: 'node', el, start: pt,
        orig: JSON.parse(JSON.stringify(el.meta.cmds)),
        ci, pi,
      });
      renderOverlay();
      return;
    }
  }

  if (state.nodeEditId && state.tool === 'select') {
    const isNodeHit = target.closest?.('[data-nodeci]');
    if (!isNodeHit) { state.nodeEditId = null; state.nodeSel = null; }
  }

  if (state.tool === 'select') {
    const holder = target.closest?.('[data-id]');
    if (holder) {
      const id = holder.getAttribute('data-id')!;
      const el = getElById(id);
      if (el?.locked) { renderOverlay(); return; }

      const selectIds = el?.groupId ? getGroupMembers(el) : [id];

      if (e.shiftKey) {
        const allIn = selectIds.every(sid => state.selection.includes(sid));
        if (allIn) {
          state.selection = state.selection.filter(sid => !selectIds.includes(sid));
        } else {
          state.selection = Array.from(new Set([...state.selection, ...selectIds]));
        }
      } else if (!selectIds.every(sid => state.selection.includes(sid))) {
        state.selection = selectIds;
      }

      renderAll();
      startMove(e);
      return;
    }
    if (!e.shiftKey) {
      state.selection = [];
      state.nodeEditId = null;
      state.nodeSel = null;
    }
    renderAll();
    startMarquee(e, pt);
    return;
  }

  if (state.tool === 'pen') {
    const finished = penClick(pt);
    if (finished) { addElement(finished); setTool('select'); }
    return;
  }
  if (state.tool === 'text') {
    const el = createTextAt(pt);
    addElement(el);
    setTool('select');
    setTimeout(() => {
      const ta = document.getElementById('textContent') as HTMLTextAreaElement;
      ta?.focus();
      ta?.select();
    }, 30);
    return;
  }

  startCreate(e, pt);
}

/* ============================================================
 * POINTER MOVE
 * ============================================================ */
function onPointerMove(e: PointerEvent) {
  const cp = toCanvas(e);
  document.getElementById('stX')!.textContent = String(Math.round(cp.x));
  document.getElementById('stY')!.textContent = String(Math.round(cp.y));

  if (!drag) return;
  const pt = toCanvas(e);

  switch (drag.type) {
    case 'pan':
      state.pan.x = drag.pan0.x + (e.clientX - drag.sx);
      state.pan.y = drag.pan0.y + (e.clientY - drag.sy);
      (window as any).__updateViewport?.();
      break;

    case 'move': {
      let dx = pt.x - drag.start.x;
      let dy = pt.y - drag.start.y;

      if (e.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }

      /* ---------- SMART GUIDES (snap) ---------- */
      if (!e.altKey && CONFIG.smartGuides.enabled) {
        // Bounding box gabungan semua elemen yang di-drag
        const boxes: BBox[] = [];
        for (const o of drag.orig) {
          const b = getBBoxOf(o.el);
          if (b) boxes.push(b);
        }

        if (boxes.length) {
          let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
          for (const b of boxes) {
            x1 = Math.min(x1, b.x);
            y1 = Math.min(y1, b.y);
            x2 = Math.max(x2, b.x + b.width);
            y2 = Math.max(y2, b.y + b.height);
          }
          const movingBox: BBox = {
            x: x1 + dx, y: y1 + dy,
            width: x2 - x1, height: y2 - y1,
          };

          const snap = computeSnap(movingBox, getExcludedIds());
          dx += snap.dx;
          dy += snap.dy;
          renderGuides(snap.guides);
        }
      } else {
        renderGuides([]);
      }

      /* ---------- Apply ---------- */
      for (const o of drag.orig) {
        o.el.attrs = translateAttrs(o.attrs, o.el.type, dx, dy);
        if (o.pivot) {
          o.el.meta.pivot = { x: o.pivot.x + dx, y: o.pivot.y + dy };
        }
      }
      if (dx || dy) drag.moved = true;
      renderLive();
      break;
    }

    case 'resize': {
      const el = drag.el;
      const local = drag.rot ? rotPoint(pt, drag.pivot, -drag.rot) : pt;
      const b0 = drag.box0;
      const k = drag.key;

      let x1 = b0.x, y1 = b0.y, x2 = b0.x + b0.width, y2 = b0.y + b0.height;
      if (k.includes('w')) x1 = local.x;
      if (k.includes('e')) x2 = local.x;
      if (k.includes('n')) y1 = local.y;
      if (k.includes('s')) y2 = local.y;

      /* ---------- SMART GUIDES (snap edges) ---------- */
      const canSnap = !e.altKey
        && CONFIG.smartGuides.enabled
        && !drag.rot
        && !e.shiftKey;   // skip proportional untuk hindari konflik

      if (canSnap) {
        const res = snapResize(x1, y1, x2, y2, k, getExcludedIds());
        x1 = res.x1; y1 = res.y1;
        x2 = res.x2; y2 = res.y2;
        renderGuides(res.guides);
      } else {
        renderGuides([]);
      }

      /* Aspect-ratio constraint (hanya corner handle) */
      const isCorner = k.length === 2;
      if (e.shiftKey && isCorner && b0.width > 0.001 && b0.height > 0.001) {
        const ratio = b0.width / b0.height;
        let nw = Math.abs(x2 - x1), nh = Math.abs(y2 - y1);
        if (nw / Math.max(nh, 0.001) > ratio) nh = nw / ratio;
        else nw = nh * ratio;
        if (k.includes('w')) x1 = x2 - nw; else x2 = x1 + nw;
        if (k.includes('n')) y1 = y2 - nh; else y2 = y1 + nh;
      }

      const nx = Math.min(x1, x2), ny = Math.min(y1, y2);
      const nw2 = Math.max(CONFIG.minSize, Math.abs(x2 - x1));
      const nh2 = Math.max(CONFIG.minSize, Math.abs(y2 - y1));

      el.attrs = (window as any).__scaleAttrs(
        drag.orig, el.type, b0,
        { x: nx, y: ny, width: nw2, height: nh2 },
      );
      el.meta.cmds = null;
      renderLive();
      break;
    }

    case 'rotate': {
      const ang = Math.atan2(pt.y - drag.pivot.y, pt.x - drag.pivot.x) * 180 / Math.PI;
      let r = drag.rot0 + (ang - drag.startAngle);
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      drag.el.meta.rotation = ((r % 360) + 360) % 360;
      renderLive();
      break;
    }

    case 'marquee':
      drag.cur = pt;
      renderOverlay();
      break;

    case 'create':
      drag.cur = pt;
      renderOverlay();
      break;

    case 'node': {
      const dx = pt.x - drag.start.x, dy = pt.y - drag.start.y;
      const cmds = JSON.parse(JSON.stringify(drag.orig));
      const cmd = cmds[drag.ci];
      if (cmd && cmd.pts.length > drag.pi + 1) {
        cmd.pts[drag.pi] = drag.orig[drag.ci].pts[drag.pi] + dx;
        cmd.pts[drag.pi + 1] = drag.orig[drag.ci].pts[drag.pi + 1] + dy;
      }
      drag.el.meta.cmds = cmds;
      drag.el.attrs.d = (window as any).__buildPathData(cmds);
      renderLive();
      break;
    }
  }
}

/* ============================================================
 * POINTER UP
 * ============================================================ */
function onPointerUp(_e: PointerEvent) {
  renderGuides([]);   // clear smart guides

  if (!drag) return;
  const d = drag;

  if (d.type === 'move' && d.moved) {
    pushHistory();
    renderAll();
  } else if (d.type === 'resize' || d.type === 'rotate' || d.type === 'node') {
    pushHistory();
    renderAll();
  } else if (d.type === 'marquee') {
    const p0 = d.start, p1 = d.cur || d.start;
    const x1 = Math.min(p0.x, p1.x), y1 = Math.min(p0.y, p1.y);
    const x2 = Math.max(p0.x, p1.x), y2 = Math.max(p0.y, p1.y);
    const found: string[] = [];
    state.elements.forEach(el => {
      if (el.hidden || el.locked) return;
      const bb = unionBBox([el]);
      if (!bb) return;
      if (bb.x < x2 && bb.x + bb.width > x1 &&
          bb.y < y2 && bb.y + bb.height > y1) found.push(el.id);
    });
    state.selection = d.add
      ? Array.from(new Set(d.base.concat(found)))
      : found;
    renderAll();
  } else if (d.type === 'create') {
    const p0 = d.start;
    let p1 = d.cur;
    const w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
    if (w < 3 && h < 3) {
      if (d.tool === 'line') p1 = { x: p0.x + CONFIG.defaultShape.w, y: p0.y };
      else p1 = { x: p0.x + CONFIG.defaultShape.w, y: p0.y + CONFIG.defaultShape.h };
    }
    const el = buildShapeFromDrag(d.tool, p0, p1);
    setDrag(null);
    if (el) addElement(el);
    else renderOverlay();
    return;
  } else if (d.type === 'pan') {
    (document.getElementById('stage') as HTMLElement).style.cursor =
      state.tool === 'hand' ? 'grab' : 'default';
  }

  setDrag(null);
  if (state.tool === 'select') renderOverlay();
}

/* ============================================================
 * RIGHT-CLICK CONTEXT MENU
 * ============================================================ */
function onContextMenu(e: MouseEvent) {
  e.preventDefault();
  hideContextMenu();

  const target = e.target as Element;
  const holder = target.closest?.('[data-id]');
  const onOverlay = !!target.closest?.('#overlay');
  const onElement = !!holder || (state.selection.length > 0 && onOverlay);

  const items: MenuItem[] = [];

  if (onElement) {
    if (holder) {
      const id = holder.getAttribute('data-id')!;
      const el = getElById(id);
      if (el && !state.selection.includes(id)) {
        state.selection = el.groupId ? getGroupMembers(el) : [id];
        renderAll();
      }
    }

    const sels = selectedEls();
    const el0 = sels[0];
    if (!el0) return;

    const hasGrouped = sels.some(s => !!s.groupId);
    const canGroup = sels.length >= 2;
    const allLocked = sels.every(s => s.locked);
    const allHidden = sels.every(s => s.hidden);

    items.push(
      { label: 'Duplicate', shortcut: 'Ctrl+D', action: duplicateSelection },
      { label: 'Delete', shortcut: 'Del', danger: true, action: deleteSelection },
      { divider: true },
      { label: 'Copy', shortcut: 'Ctrl+C', action: copySelection },
      { label: 'Cut', shortcut: 'Ctrl+X', action: cutSelection },
      { label: 'Paste', shortcut: 'Ctrl+V', action: paste, disabled: !hasClipboard() },
      { divider: true },
      { label: 'Group', shortcut: 'Ctrl+G', action: groupSelection, disabled: !canGroup },
      { label: 'Ungroup', shortcut: 'Ctrl+Shift+G', action: ungroupSelection, disabled: !hasGrouped },
      { divider: true },
      { label: 'Bring to Front', shortcut: 'Ctrl+]', action: bringToFront },
      { label: 'Bring Forward', action: bringForward },
      { label: 'Send Backward', action: sendBackward },
      { label: 'Send to Back', shortcut: 'Ctrl+[', action: sendToBack },
      { divider: true },
      { label: allLocked ? 'Unlock' : 'Lock', action: toggleLock },
      { label: allHidden ? 'Show' : 'Hide', action: toggleHide },
      { divider: true },
      { label: 'Rename…', shortcut: 'F2', action: renameSelection },
    );

    if (el0.type === 'path') {
      items.push({
        label: 'Edit Nodes',
        action: () => {
          state.nodeEditId = el0.id;
          el0.meta.cmds = parsePathDataSafe(el0.attrs.d as string);
          renderAll();
        },
      });
    }
  } else {
    state.selection = [];
    renderAll();

    items.push(
      { label: 'Paste', shortcut: 'Ctrl+V', action: paste, disabled: !hasClipboard() },
      {
        label: 'Select All',
        shortcut: 'Ctrl+A',
        action: () => {
          state.selection = state.elements
            .filter(el => !el.hidden && !el.locked)
            .map(el => el.id);
          renderAll();
        },
        disabled: state.elements.length === 0,
      },
      { divider: true },
      { label: 'Fit to Screen', action: () => (window as any).__zoomToFit?.() },
      {
        label: 'Reset Zoom (100%)',
        action: () => {
          const stg = document.getElementById('stage')!;
          const r = stg.getBoundingClientRect();
          state.zoom = 1;
          state.pan.x = (r.width - state.canvas.width) / 2;
          state.pan.y = (r.height - state.canvas.height) / 2;
          (window as any).__updateViewport?.();
          renderAll();
        },
      },
    );
  }

  showContextMenu(e.clientX, e.clientY, items);
}