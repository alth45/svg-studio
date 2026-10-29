/* ============================================================
 * ui/layers.ts — Layers panel with group badges
 * ============================================================ */

import { state, getGroupMembers } from '../core/state';
import { pushHistory } from '../core/history';
import { renderAll } from '../app';

export function renderLayers() {
  const list = document.getElementById('layerList')!;
  list.innerHTML = '';
  document.getElementById('layerCount')!.textContent =
    String(state.elements.length);

  const els = state.elements.slice().reverse();
  els.forEach(el => {
    const isGrouped = !!el.groupId;
    const row = document.createElement('div');
    row.className =
      'layer-row' +
      (state.selection.includes(el.id) ? ' sel' : '') +
      (isGrouped ? ' grouped' : '');
    row.draggable = true;
    row.dataset.id = el.id;

    /* Group badge (⧉) */
    if (isGrouped) {
      const badge = document.createElement('span');
      badge.className = 'layer-group-badge';
      badge.textContent = '⧉';
      badge.title = state.groupNames[el.groupId!] || 'Group';
      row.appendChild(badge);
    }

    /* Swatch */
    const sw = document.createElement('span');
    sw.className = 'layer-swatch';
    const f = el.attrs.fill;
    if (f && f !== 'none') {
      sw.style.background = String(f);
    } else if (el.attrs.stroke && el.attrs.stroke !== 'none') {
      sw.style.background = String(el.attrs.stroke);
      sw.style.borderRadius = '50%';
    } else {
      sw.style.background = 'transparent';
      sw.style.border = '1px dashed #555';
    }
    row.appendChild(sw);

    /* Name */
    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = el.name;
    row.appendChild(name);

    /* Hide */
    const bh = document.createElement('button');
    bh.className = 'layer-btn' + (el.hidden ? ' off' : '');
    bh.textContent = el.hidden ? '🚫' : '👁';
    bh.title = 'Show/Hide';
    bh.addEventListener('click', (ev) => {
      ev.stopPropagation();
      el.hidden = !el.hidden;
      pushHistory();
      renderAll();
    });
    row.appendChild(bh);

    /* Lock */
    const bl = document.createElement('button');
    bl.className = 'layer-btn' + (el.locked ? ' off' : '');
    bl.textContent = el.locked ? '🔒' : '🔓';
    bl.title = 'Lock/Unlock';
    bl.addEventListener('click', (ev) => {
      ev.stopPropagation();
      el.locked = !el.locked;
      pushHistory();
      renderAll();
    });
    row.appendChild(bl);

    /* Delete */
    const bd = document.createElement('button');
    bd.className = 'layer-btn';
    bd.textContent = '✕';
    bd.title = 'Delete';
    bd.addEventListener('click', (ev) => {
      ev.stopPropagation();
      state.elements = state.elements.filter(x => x.id !== el.id);
      state.selection = state.selection.filter(id => id !== el.id);
      pushHistory();
      renderAll();
    });
    row.appendChild(bd);

    /* Selection (group-aware) */
    row.addEventListener('pointerdown', (ev) => {
      if ((ev.target as HTMLElement).tagName === 'BUTTON') return;
      const selectIds = isGrouped ? getGroupMembers(el) : [el.id];

      if (ev.shiftKey) {
        const allIn = selectIds.every(sid => state.selection.includes(sid));
        if (allIn) {
          state.selection = state.selection.filter(sid => !selectIds.includes(sid));
        } else {
          state.selection = Array.from(new Set([...state.selection, ...selectIds]));
        }
      } else {
        state.selection = selectIds;
      }
      renderAll();
    });

    /* Rename */
    row.addEventListener('dblclick', () => {
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
    });

    /* Drag & drop */
    row.addEventListener('dragstart', (ev) => {
      ev.dataTransfer?.setData('text/plain', el.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      row.classList.add('dragover');
    });
    row.addEventListener('dragleave', () => row.classList.remove('dragover'));
    row.addEventListener('drop', (ev) => {
      ev.preventDefault();
      row.classList.remove('dragover');
      const srcId = ev.dataTransfer?.getData('text/plain');
      if (srcId) reorderLayer(srcId, el.id);
    });

    list.appendChild(row);
  });
}

function reorderLayer(srcId: string, targetId: string) {
  if (srcId === targetId) return;
  const els = state.elements;
  const si = els.findIndex(e => e.id === srcId);
  if (si < 0) return;
  const [moved] = els.splice(si, 1);
  const ti = els.findIndex(e => e.id === targetId);
  if (ti < 0) els.push(moved);
  else els.splice(ti + 1, 0, moved);
  pushHistory();
  renderAll();
}