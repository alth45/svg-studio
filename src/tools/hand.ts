import { state, setDrag } from '../core/state';

export function startPan(e: PointerEvent) {
  setDrag({
    type: 'pan', sx: e.clientX, sy: e.clientY,
    pan0: { x: state.pan.x, y: state.pan.y },
  });
  (document.getElementById('stage') as HTMLElement).style.cursor = 'grabbing';
}