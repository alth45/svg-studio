import type { ToolId } from '../types';
import { state } from '../core/state';

const ICONS: Record<ToolId, string> = {
  select: '<path d="M3 2l7 16 2.2-6.2L18.5 14z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  hand:   '<path d="M6 11V5.5a1.5 1.5 0 013 0V10m0-4.5a1.5 1.5 0 013 0V10m0-3.5a1.5 1.5 0 013 0V11m0-1.5a1.5 1.5 0 013 0V14a5 5 0 01-5 5h-2a5 5 0 01-5-5v-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  rect:   '<rect x="3.5" y="5.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  ellipse:'<ellipse cx="10" cy="11" rx="7" ry="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  line:   '<path d="M4 17L16 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  star:   '<path d="M10 3l2.2 5.2 5.6.5-4.2 3.8 1.3 5.5L10 15.2 5.1 18l1.3-5.5L2.2 8.7l5.6-.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',

  // ---- NEW ----
  triangle: '<path d="M10 3l7 13H3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  diamond:  '<path d="M10 3l7 7-7 7-7-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  hexagon:  '<path d="M10 2.5l6 3.5v7l-6 3.5-6-3.5v-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  octagon:  '<path d="M7 3h6l4 4v6l-4 4H7l-4-4V7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  arrow:    '<path d="M3 10h11M10 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  heart:    '<path d="M10 17c-1-2-6-5-6-9a3 3 0 016-1 3 3 0 016 1c0 4-5 7-6 9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  cross:    '<path d="M8 3h4v5h5v4h-5v5H8v-5H3V8h5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  speech:   '<path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',

  pen:    '<path d="M10 2l4 8-4 8-4-8z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/>',
  text:   '<path d="M4 5h12M10 5v11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
};

type ToolDef = { id: ToolId; label: string; divider?: boolean };

const TOOLS: ToolDef[] = [
  { id: 'select',  label: 'Select (V)' },
  { id: 'hand',    label: 'Hand / Pan (H)' },
  { id: 'rect',    label: 'Rectangle (R)',       divider: true },
  { id: 'ellipse', label: 'Ellipse (O)' },
  { id: 'line',    label: 'Line (L)' },
  { id: 'star',    label: 'Star / Polygon (S)' },
  { id: 'triangle', label: 'Triangle (1)' },
  { id: 'diamond',  label: 'Diamond (2)' },
  { id: 'hexagon',  label: 'Hexagon (3)' },
  { id: 'octagon',  label: 'Octagon (4)' },
  { id: 'arrow',    label: 'Arrow (5)' },
  { id: 'heart',    label: 'Heart (6)' },
  { id: 'cross',    label: 'Cross (7)' },
  { id: 'speech',   label: 'Speech Bubble (8)' },
  { id: 'pen',      label: 'Pen / Path (P)',     divider: true },
  { id: 'text',     label: 'Text (T)' },
];

export function buildToolbar(onSelect: (id: ToolId) => void) {
  const tb = document.getElementById('toolbar')!;
  tb.innerHTML = '';

  TOOLS.forEach(t => {
    if (t.divider) {
      const d = document.createElement('div');
      d.className = 'tool-divider';
      d.setAttribute('aria-hidden', 'true');
      tb.appendChild(d);
    }
    const b = document.createElement('button');
    b.className = 'tool-btn' + (state.tool === t.id ? ' active' : '');
    b.dataset.tool = t.id;
    b.innerHTML = `<svg viewBox="0 0 20 20">${ICONS[t.id]}</svg><span class="tt">${t.label}</span>`;
    b.addEventListener('click', () => onSelect(t.id));
    tb.appendChild(b);
  });
}

export function highlightTool(id: ToolId) {
  document.querySelectorAll<HTMLElement>('.tool-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === id);
  });
}