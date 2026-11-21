// Small helpers shared by every module: maths, geometry, DOM, colours and storage.
export const DEG = Math.PI / 180;
export const $ = id => document.getElementById(id);
export const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const C = {}; ['--sea','--sea-shallow','--ink','--ink-soft','--red','--green','--amber','--sail','--land'].forEach(k => C[k] = css(k));

export const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
export const cr = (ax, ay, bx, by) => ax * by - ay * bx;
// do segments p-q and a-b cross?
export function segHit(p, q, a, b) {
  const d1 = cr(b.x - a.x, b.y - a.y, p.x - a.x, p.y - a.y), d2 = cr(b.x - a.x, b.y - a.y, q.x - a.x, q.y - a.y);
  const d3 = cr(q.x - p.x, q.y - p.y, a.x - p.x, a.y - p.y), d4 = cr(q.x - p.x, q.y - p.y, b.x - p.x, b.y - p.y);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}

export const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export const stored = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
export const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
