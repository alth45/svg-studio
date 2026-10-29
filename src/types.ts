/* ============================================================
 * types.ts — Shared type definitions
 * ============================================================ */

export type ToolId =
  | 'select' | 'hand'
  | 'rect' | 'ellipse' | 'line' | 'star'
  | 'triangle' | 'diamond' | 'hexagon' | 'octagon'
  | 'arrow' | 'heart' | 'cross' | 'speech'
  | 'pen' | 'text';

export type ElementType = 'rect' | 'ellipse' | 'line' | 'polygon' | 'path' | 'text';

export interface Point { x: number; y: number; }
export interface BBox { x: number; y: number; width: number; height: number; }
export interface Matrix { a: number; b: number; c: number; d: number; e: number; f: number; }
export interface PathCommand { c: string; pts: number[]; }

export interface ElementMeta {
  rotation: number;
  pivot: Point | null;
  sides: number;
  star: boolean;
  cmds: PathCommand[] | null;
}

export interface SvgElement {
  id: string;
  type: ElementType;
  name: string;
  locked: boolean;
  hidden: boolean;
  meta: ElementMeta;
  attrs: Record<string, string | number | undefined>;
  text?: string;
  groupId?: string;
}

export interface StyleState {
  fill: string;
  fillNone: boolean;
  fillOpacity: number;
  stroke: string;
  strokeNone: boolean;
  strokeWidth: number;
  dash: string;
  cap: string;
  join: string;
  opacity: number;
}

export interface CanvasSize { width: number; height: number; }

export interface AppState {
  docName: string;
  canvas: CanvasSize;
  elements: SvgElement[];
  selection: string[];
  tool: ToolId;
  zoom: number;
  pan: Point;
  showGrid: boolean;
  nextId: number;
  pathDraft: { points: Point[] } | null;
  nodeEditId: string | null;
  nodeSel: { ci: number; pi: number } | null;
  style: StyleState;
  groupNames: Record<string, string>;
}

export interface DragState {
  type: string;
  [k: string]: any;
}