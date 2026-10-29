import { state } from '../core/state';
import { setZoom } from '../render/viewport';

export function bindWheelZoom() {
  const stage = document.getElementById('stage')!;
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom(state.zoom * factor, { x: e.clientX, y: e.clientY });
  }, { passive: false });

  (window as any).__setZoomFromWheel = (e: WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom(state.zoom * factor, { x: e.clientX, y: e.clientY });
  };
}