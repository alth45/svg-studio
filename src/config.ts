import type { StyleState } from './types';

export const NS = 'http://www.w3.org/2000/svg';

export const CONFIG = {
  canvas: { width: 800, height: 600 },
  defaultFill: '#7c8aff',
  defaultStroke: '#1e1e1e',
  gridSize: 20,
  handleSize: 8,
  rotOffset: 26,
  minZoom: 0.05,
  maxZoom: 20,
  maxHistory: 50,
  minSize: 1,
  defaultShape: { w: 120, h: 80 },
};

export const TOOL_KEYS: Record<string, string> = {
  v: 'select', h: 'hand', r: 'rect', o: 'ellipse',
  l: 'line', s: 'star', p: 'pen', t: 'text',
  '1': 'triangle', '2': 'diamond', '3': 'hexagon', '4': 'octagon',
  '5': 'arrow',    '6': 'heart',   '7': 'cross',   '8': 'speech',
};

export const DEFAULT_STYLE: StyleState = {
  fill: CONFIG.defaultFill,
  fillNone: false,
  fillOpacity: 1,
  stroke: CONFIG.defaultStroke,
  strokeNone: true,
  strokeWidth: 0,
  dash: 'none',
  cap: 'butt',
  join: 'miter',
  opacity: 1,
};