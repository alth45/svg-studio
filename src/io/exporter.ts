/* ============================================================
 * io/exporter.ts — SVG export with group serialization
 * ============================================================ */

import { state } from '../core/state';
import { elementToSVGString } from '../model/serializer';
import { escAttr } from '../utils/dom';
import { toast } from '../tools/toast';

export function generateSVGString(): string {
  const w = state.canvas.width, h = state.canvas.height;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;

  const renderedGroups = new Set<string>();

  for (const el of state.elements) {
    if (el.hidden) continue;

    if (el.groupId) {
      if (renderedGroups.has(el.groupId)) continue;
      renderedGroups.add(el.groupId);

      const members = state.elements.filter(
        m => m.groupId === el.groupId && !m.hidden,
      );
      const groupName = state.groupNames[el.groupId] || 'Group';
      const safeId = groupName.replace(/[^\w-]/g, '_');
      out += `  <g id="${escAttr(safeId)}">\n`;
      for (const m of members) {
        out += `    ${elementToSVGString(m)}\n`;
      }
      out += `  </g>\n`;
    } else {
      out += `  ${elementToSVGString(el)}\n`;
    }
  }

  out += '</svg>';
  return out;
}

export function downloadSVG() {
  const svg = generateSVGString();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (state.docName || 'drawing').replace(/[^\w\-]+/g, '_') + '.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Downloaded .svg');
}