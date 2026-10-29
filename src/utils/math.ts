import type { Point } from '../types';

export const round = (n: number) => Math.round(n * 100) / 100;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);