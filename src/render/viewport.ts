import { state } from '../core/state';
import { round } from '../utils/math';
import { $ } from '../utils/dom';
import { renderOverlay } from './overlay';

export function updateViewport() {
  $('#viewport').setAttribute(
    'transform',
    `translate(${round(state.pan.x)} ${round(state.pan.y)}) scale(${state.zoom})`
  );
}

export function zoomToFit() {
  const stage = $('#stage') as unknown as SVGSVGElement;
  const r = stage.getBoundingClientRect();
  const pad = 60;
  const z = Math.min(
    (r.width - pad * 2) / state.canvas.width,
    (r.height - pad * 2) / state.canvas.height
  );
  state.zoom = Math.max(0.05, Math.min(20, z));
  state.pan.x = (r.width - state.canvas.width * state.zoom) / 2;
  state.pan.y = (r.height - state.canvas.height * state.zoom) / 2;
  updateViewport();
  renderOverlay();
}

export function setZoom(z: number, anchor?: { x: number; y: number }) {
  const old = state.zoom;
  z = Math.max(0.05, Math.min(20, z));
  if (Math.abs(z - old) < 1e-9) return;
  if (anchor) {
    const stage = $('#stage') as unknown as SVGSVGElement;
    const r = stage.getBoundingClientRect();
    const sx = anchor.x - r.left;
    const sy = anchor.y - r.top;
    const cx = (sx - state.pan.x) / old;
    const cy = (sy - state.pan.y) / old;
    state.pan.x = sx - cx * z;
    state.pan.y = sy - cy * z;
  }
  state.zoom = z;
  updateViewport();
  renderOverlay();
  document.querySelector('#stZoom')!.textContent = Math.round(z * 100) + '%';
  document.querySelector('#btnZoomReset')!.textContent = Math.round(z * 100) + '%';
}