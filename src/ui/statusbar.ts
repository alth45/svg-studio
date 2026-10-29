import { state } from '../core/state';
import { pushHistory } from '../core/history';
import { updateCanvasSize, renderGrid } from '../render/grid';
import { renderAll } from '../app';

export function bindStatusbar() {
  const stW = document.getElementById('stW') as HTMLInputElement;
  const stH = document.getElementById('stH') as HTMLInputElement;
  const chkGrid = document.getElementById('chkGrid') as HTMLInputElement;

  chkGrid.addEventListener('change', () => {
    state.showGrid = chkGrid.checked;
    renderGrid();
  });

  const applySize = () => {
    const w = Math.max(1, Math.min(8000, parseInt(stW.value, 10) || 1));
    const h = Math.max(1, Math.min(8000, parseInt(stH.value, 10) || 1));
    state.canvas = { width: w, height: h };
    updateCanvasSize();
    pushHistory();
    renderAll();
  };
  stW.addEventListener('change', applySize);
  stH.addEventListener('change', applySize);
}

const HINTS: Record<string, string> = {
  select:   'Select: klik/drag untuk pilih & pindah',
  hand:     'Hand: drag untuk pan',
  rect:     'Rectangle: drag di canvas',
  ellipse:  'Ellipse: drag di canvas',
  line:     'Line: drag di canvas',
  star:     'Star / Polygon: drag di canvas',
  triangle: 'Triangle: drag di canvas',
  diamond:  'Diamond: drag di canvas',
  hexagon:  'Hexagon: drag di canvas',
  octagon:  'Octagon: drag di canvas',
  arrow:    'Arrow: drag di canvas',
  heart:    'Heart: drag di canvas',
  cross:    'Cross: drag di canvas',
  speech:   'Speech Bubble: drag di canvas',
  pen:      'Pen: klik titik, Enter untuk tutup, Esc selesai',
  text:     'Text: klik di canvas untuk menaruh teks',
};

export function updateStatus() {
  document.getElementById('stZoom')!.textContent = Math.round(state.zoom * 100) + '%';
  document.getElementById('btnZoomReset')!.textContent = Math.round(state.zoom * 100) + '%';
  document.getElementById('stHint')!.textContent = HINTS[state.tool] || '';
}