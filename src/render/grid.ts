import { state } from '../core/state';
import { CONFIG } from '../config';
import { createSVG, $ } from '../utils/dom';

export function renderGrid() {
  const g = $('#gridLayer');
  g.innerHTML = '';
  if (!state.showGrid) return;
  const step = CONFIG.gridSize;
  const w = state.canvas.width, h = state.canvas.height;
  for (let x = step; x < w; x += step) {
    g.appendChild(createSVG('line', {
      x1: x, y1: 0, x2: x, y2: h, stroke: '#eaeaea', 'stroke-width': 1,
    }));
  }
  for (let y = step; y < h; y += step) {
    g.appendChild(createSVG('line', {
      x1: 0, y1: y, x2: w, y2: y, stroke: '#eaeaea', 'stroke-width': 1,
    }));
  }
}

export function updateCanvasSize() {
  const ab = $('#artboard'), cr = $('#clipRect');
  ab.setAttribute('width', String(state.canvas.width));
  ab.setAttribute('height', String(state.canvas.height));
  cr.setAttribute('width', String(state.canvas.width));
  cr.setAttribute('height', String(state.canvas.height));
  ($('#stW') as HTMLInputElement).value = String(state.canvas.width);
  ($('#stH') as HTMLInputElement).value = String(state.canvas.height);
  renderGrid();
}