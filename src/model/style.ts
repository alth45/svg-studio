import { state } from '../core/state';
import { round } from '../utils/math';

export function styleAttrs(): Record<string, string | number> {
  const s = state.style, a: Record<string, any> = {};
  a.fill = s.fillNone ? 'none' : s.fill;
  if (!s.fillNone && s.fillOpacity !== 1) a['fill-opacity'] = round(s.fillOpacity);
  if (!s.strokeNone && s.strokeWidth > 0) {
    a.stroke = s.stroke;
    a['stroke-width'] = round(s.strokeWidth);
    if (s.dash !== 'none') a['stroke-dasharray'] = s.dash;
    if (s.cap !== 'butt') a['stroke-linecap'] = s.cap;
    if (s.join !== 'miter') a['stroke-linejoin'] = s.join;
  } else {
    a.stroke = 'none';
  }
  if (s.opacity !== 1) a.opacity = round(s.opacity);
  return a;
}