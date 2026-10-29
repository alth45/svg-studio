import { state } from './state';

let history: string[] = [];
let histIdx = -1;

function snapshot() {
  return JSON.stringify({
    docName: state.docName,
    canvas: state.canvas,
    elements: state.elements,
    selection: state.selection,
  });
}

export function pushHistory(onChange?: () => void) {
  const snap = snapshot();
  if (history[histIdx] === snap) return;
  history = history.slice(0, histIdx + 1);
  history.push(snap);
  if (history.length > 51) history.shift();
  histIdx = history.length - 1;
  onChange?.();
}

export function undo(onRestore?: () => void) {
  if (histIdx > 0) { histIdx--; restore(history[histIdx], onRestore); }
}
export function redo(onRestore?: () => void) {
  if (histIdx < history.length - 1) { histIdx++; restore(history[histIdx], onRestore); }
}
export function resetHistory() { history = []; histIdx = -1; }
export function canUndo() { return histIdx > 0; }
export function canRedo() { return histIdx < history.length - 1; }

function restore(snap: string, cb?: () => void) {
  const d = JSON.parse(snap);
  state.docName = d.docName;
  state.canvas = d.canvas;
  state.elements = d.elements;
  state.selection = d.selection;
  state.nodeEditId = null;
  state.pathDraft = null;
  cb?.();
}