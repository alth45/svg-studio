import { state } from '../core/state';
import { makeElement } from '../model/factory';
import { styleAttrs } from '../model/style';
import { parsePathData } from '../utils/path';
import { round } from '../utils/math';
import type { Point, SvgElement } from '../types';
import { renderOverlay, isNearFirstPoint } from '../render/overlay';
import { dist } from '../utils/math';

export function penClick(pt: Point): SvgElement | null {
  if (!state.pathDraft) {
    state.pathDraft = { points: [pt] };
    renderOverlay();
    return null;
  }
  if (isNearFirstPoint(pt)) {
    return finishPath(true);
  }
  state.pathDraft.points.push(pt);
  renderOverlay();
  return null;
}

export function finishPath(close: boolean): SvgElement | null {
  const draft = state.pathDraft;
  state.pathDraft = null;
  if (!draft || draft.points.length < 2) { renderOverlay(); return null; }

  const pts = draft.points;
  let d = `M ${round(pts[0].x)} ${round(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${round(pts[i].x)} ${round(pts[i].y)}`;
  if (close) d += ' Z';

  const a = styleAttrs();
  if (!close) a.fill = 'none';
  const el = makeElement('path', { ...a, d });
  el.meta.cmds = parsePathData(d);
  return el;
}

// unused import suppress
void dist;