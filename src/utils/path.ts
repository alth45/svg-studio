import type { PathCommand, Matrix } from '../types';
import { round } from './math';

const ARGC: Record<string, number> = { m:2, l:2, h:1, v:1, c:6, s:4, q:4, t:2, a:7, z:0 };

export function parsePathData(d: string): PathCommand[] {
  const toks = String(d || '').match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!toks) return [];
  const out: PathCommand[] = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, prev: string | null = null;

  while (i < toks.length) {
    let raw = toks[i], cmd: string;
    if (/^[a-zA-Z]$/.test(raw)) { cmd = raw; i++; }
    else if (prev) { cmd = prev; }
    else break;

    const lc = cmd.toLowerCase();
    const rel = cmd === lc;
    const n = ARGC[lc];
    if (n === undefined) break;

    if (n === 0) {
      if (/^[a-zA-Z]$/.test(raw)) { out.push({ c: 'Z', pts: [] }); cx = sx; cy = sy; prev = cmd; }
      else break;
      continue;
    }

    const nums: number[] = [];
    for (let k = 0; k < n && i < toks.length; k++) nums.push(parseFloat(toks[i++]));
    if (nums.length < n) break;

    const ox = rel ? cx : 0, oy = rel ? cy : 0;

    if (lc === 'm') {
      const x = ox + nums[0], y = oy + nums[1];
      out.push({ c: 'M', pts: [x, y] });
      cx = x; cy = y; sx = x; sy = y;
      prev = rel ? 'l' : 'L';
      continue;
    }
    if (lc === 'l') { out.push({ c: 'L', pts: [ox + nums[0], oy + nums[1]] }); cx = ox + nums[0]; cy = oy + nums[1]; }
    else if (lc === 'h') { out.push({ c: 'L', pts: [ox + nums[0], cy] }); cx = ox + nums[0]; }
    else if (lc === 'v') { out.push({ c: 'L', pts: [cx, oy + nums[0]] }); cy = oy + nums[0]; }
    else if (lc === 'c') {
      const pts = [ox+nums[0], oy+nums[1], ox+nums[2], oy+nums[3], ox+nums[4], oy+nums[5]];
      out.push({ c: 'C', pts }); cx = pts[4]; cy = pts[5];
    }
    else if (lc === 's') {
      const pts = [ox+nums[0], oy+nums[1], ox+nums[2], oy+nums[3]];
      out.push({ c: 'S', pts }); cx = pts[2]; cy = pts[3];
    }
    else if (lc === 'q') {
      const pts = [ox+nums[0], oy+nums[1], ox+nums[2], oy+nums[3]];
      out.push({ c: 'Q', pts }); cx = pts[2]; cy = pts[3];
    }
    else if (lc === 't') { out.push({ c: 'T', pts: [ox + nums[0], oy + nums[1]] }); cx = ox + nums[0]; cy = oy + nums[1]; }
    else if (lc === 'a') {
      const ex = ox + nums[5], ey = oy + nums[6];
      out.push({ c: 'A', pts: [nums[0], nums[1], nums[2], nums[3], nums[4], ex, ey] });
      cx = ex; cy = ey;
    }
    prev = cmd;
  }
  return out;
}

export function buildPathData(cmds: PathCommand[]): string {
  return cmds.map(c => c.c === 'Z' ? 'Z' : c.c + ' ' + c.pts.map(round).join(' ')).join(' ');
}

export function applyMatrixToPath(d: string, m: Matrix): string {
  const toks = String(d || '').match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!toks) return d;
  const out: string[] = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, prev: string | null = null;
  const tp = (x: number, y: number): [number, number] => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
  const f = (v: number) => Math.round(v * 1000) / 1000;
  const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;

  while (i < toks.length) {
    let raw = toks[i], cmd: string;
    if (/^[a-zA-Z]$/.test(raw)) { cmd = raw; i++; }
    else if (prev && prev.toLowerCase() !== 'z') { cmd = prev; }
    else break;

    const lc = cmd.toLowerCase();
    const rel = cmd === lc;
    const n = ARGC[lc];
    if (n === undefined) break;
    if (n === 0) { out.push('Z'); cx = sx; cy = sy; prev = cmd; continue; }

    const nums: number[] = [];
    for (let k = 0; k < n && i < toks.length; k++) nums.push(parseFloat(toks[i++]));
    if (nums.length < n) break;

    const ox = rel ? cx : 0, oy = rel ? cy : 0;

    if (lc === 'm') {
      const p = tp(ox + nums[0], oy + nums[1]);
      out.push(`M ${f(p[0])} ${f(p[1])}`);
      cx = ox + nums[0]; cy = oy + nums[1]; sx = cx; sy = cy;
      prev = rel ? 'l' : 'L';
      continue;
    }
    if (lc === 'l') {
      const p = tp(ox + nums[0], oy + nums[1]);
      out.push(`L ${f(p[0])} ${f(p[1])}`); cx = ox + nums[0]; cy = oy + nums[1];
    } else if (lc === 'h') {
      const X = ox + nums[0], p = tp(X, cy);
      out.push(`L ${f(p[0])} ${f(p[1])}`); cx = X;
    } else if (lc === 'v') {
      const Y = oy + nums[0], p = tp(cx, Y);
      out.push(`L ${f(p[0])} ${f(p[1])}`); cy = Y;
    } else if (lc === 'c') {
      const p1 = tp(ox+nums[0], oy+nums[1]), p2 = tp(ox+nums[2], oy+nums[3]), p3 = tp(ox+nums[4], oy+nums[5]);
      out.push(`C ${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(p3[0])} ${f(p3[1])}`);
      cx = ox+nums[4]; cy = oy+nums[5];
    } else if (lc === 's') {
      const p1 = tp(ox+nums[0], oy+nums[1]), p2 = tp(ox+nums[2], oy+nums[3]);
      out.push(`S ${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])}`);
      cx = ox+nums[2]; cy = oy+nums[3];
    } else if (lc === 'q') {
      const p1 = tp(ox+nums[0], oy+nums[1]), p2 = tp(ox+nums[2], oy+nums[3]);
      out.push(`Q ${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])}`);
      cx = ox+nums[2]; cy = oy+nums[3];
    } else if (lc === 't') {
      const p = tp(ox+nums[0], oy+nums[1]);
      out.push(`T ${f(p[0])} ${f(p[1])}`); cx = ox+nums[0]; cy = oy+nums[1];
    } else if (lc === 'a') {
      const p = tp(ox+nums[5], oy+nums[6]);
      out.push(`A ${f(nums[0]*scale)} ${f(nums[1]*scale)} ${f(nums[2])} ${nums[3]} ${nums[4]} ${f(p[0])} ${f(p[1])}`);
      cx = ox+nums[5]; cy = oy+nums[6];
    }
    prev = cmd;
  }
  return out.join(' ');
}