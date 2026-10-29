import { state } from '../core/state';
import { pushHistory, undo, redo, canUndo, canRedo } from '../core/history';
import { setZoom, zoomToFit } from '../render/viewport';
import { generateSVGString } from '../io/exporter';
import { downloadSVG } from '../io/exporter';
import { importSVGText } from '../io/importer';
import { toast } from '../tools/toast';
import { renderAll } from '../app';

export function bindTopbar() {
  const btnNew = document.getElementById('btnNew')!;
  const btnImport = document.getElementById('btnImport')!;
  const btnExport = document.getElementById('btnExport')!;
  const btnDownload = document.getElementById('btnDownload')!;
  const btnUndo = document.getElementById('btnUndo') as HTMLButtonElement;
  const btnRedo = document.getElementById('btnRedo') as HTMLButtonElement;
  const btnZoomIn = document.getElementById('btnZoomIn')!;
  const btnZoomOut = document.getElementById('btnZoomOut')!;
  const btnZoomReset = document.getElementById('btnZoomReset')!;
  const btnFit = document.getElementById('btnFit')!;
  const docName = document.getElementById('docName') as HTMLInputElement;
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const exportModal = document.getElementById('exportModal')!;
  const btnCloseModal = document.getElementById('btnCloseModal')!;
  const btnCopyCode = document.getElementById('btnCopyCode')!;
  const btnDownload2 = document.getElementById('btnDownload2')!;
  const exportCode = document.getElementById('exportCode') as HTMLTextAreaElement;

  const refreshHistory = () => {
    btnUndo.disabled = !canUndo();
    btnRedo.disabled = !canRedo();
  };
  refreshHistory();

  btnUndo.addEventListener('click', () => { undo(renderAll); refreshHistory(); });
  btnRedo.addEventListener('click', () => { redo(renderAll); refreshHistory(); });

  btnImport.addEventListener('click', () => fileInput.click());
  btnDownload.addEventListener('click', downloadSVG);
  btnDownload2.addEventListener('click', downloadSVG);

  btnExport.addEventListener('click', () => {
    exportCode.value = generateSVGString();
    exportModal.classList.add('open');
  });
  btnCloseModal.addEventListener('click', () => exportModal.classList.remove('open'));
  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.remove('open');
  });
  btnCopyCode.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(exportCode.value);
      toast('Copied!');
    } catch {
      exportCode.select();
      document.execCommand('copy');
      toast('Copied!');
    }
  });

  btnZoomIn.addEventListener('click', () => setZoom(state.zoom * 1.2));
  btnZoomOut.addEventListener('click', () => setZoom(state.zoom / 1.2));
  btnZoomReset.addEventListener('click', () => {
    const stage = document.getElementById('stage')!;
    const r = stage.getBoundingClientRect();
    state.zoom = 1;
    state.pan.x = (r.width - state.canvas.width) / 2;
    state.pan.y = (r.height - state.canvas.height) / 2;
    setZoom(1);
    renderAll();
  });
  btnFit.addEventListener('click', () => zoomToFit());

  docName.addEventListener('input', () => { state.docName = docName.value || 'Untitled'; });

  fileInput.addEventListener('change', (e) => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importSVGText(String(reader.result));
        renderAll();
        refreshHistory();
      } catch (err: any) {
        toast('Import gagal: ' + err.message, true);
      }
    };
    reader.onerror = () => toast('Gagal membaca file', true);
    reader.readAsText(file);
    fileInput.value = '';
  });

  // expose refreshHistory to app
  (window as any).__refreshHistory = refreshHistory;
  void btnNew;
  void pushHistory;
}

export function refreshHistoryButtons() {
  (window as any).__refreshHistory?.();
}