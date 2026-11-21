// The start boat (the race committee boat). It lies at the starboard end of the start line until the player has
// crossed the start, then motors round the harbour to the finish and anchors beyond one end of the finish line,
// replacing that pin. Anchored, it lies head to wind; under way it follows a path that stays clear of the shore.
import { clamp, norm } from './util.js';
import { W, H, isLand } from './chart.js';
import { game } from './game.js';

export const START_BOAT_LEN = 64, START_BOAT_BEAM = 22;
const SPEED = 110;  // world units/s, about 9 knots
const TURN = 2.2;   // rad/s
const CELL = 15;    // pathfinding grid cell (world units)
const CLEAR = 30;   // the path keeps this far from land

// state: 'start' (anchored at the start), 'motoring', 'finish' (anchored at the finish)
export const committee = { x: 0, y: 0, h: 0, v: 0, state: 'start', path: [], wp: 0, wake: [], wakeT: 0 };

export function resetCommittee() {
  const sb = game.course.startBoat;
  Object.assign(committee, { x: sb.x, y: sb.y, h: game.windFrom, v: 0, state: 'start', path: [], wp: 0, wake: [], wakeT: 0 });
}

// Is world point (x, y) inside the committee boat's hull (an ellipse a little larger than the drawn hull)?
export function hitsCommittee(x, y) {
  const c = committee, dx = x - c.x, dy = y - c.y;
  const fwd = dx * Math.sin(c.h) - dy * Math.cos(c.h), side = dx * Math.cos(c.h) + dy * Math.sin(c.h);
  return (fwd / (START_BOAT_LEN / 2 + 3)) ** 2 + (side / (START_BOAT_BEAM / 2 + 3)) ** 2 < 1;
}

// --- Pathfinding: A* over a grid of open-water cells, then straightened where the water allows ---------------
const gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL);
let free = null; // per cell: 1 if open water at least CLEAR from land; built on first use
function freeGrid() {
  if (free) return free;
  free = new Uint8Array(gw * gh);
  const ring = Array.from({ length: 8 }, (_, k) => [Math.cos(k * Math.PI / 4) * CLEAR, Math.sin(k * Math.PI / 4) * CLEAR]);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = (i + 0.5) * CELL, y = (j + 0.5) * CELL;
    free[j * gw + i] = !isLand(x, y) && ring.every(([dx, dy]) => !isLand(x + dx, y + dy)) ? 1 : 0;
  }
  return free;
}
const cellOf = (x, y) => clamp(Math.floor(y / CELL), 0, gh - 1) * gw + clamp(Math.floor(x / CELL), 0, gw - 1);
const centre = c => ({ x: (c % gw + 0.5) * CELL, y: (Math.floor(c / gw) + 0.5) * CELL });

// Water all the way from p to q, with room for the hull either side?
function clearRun(p, q) {
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy), n = Math.ceil(len / 8);
  const sx = -dy / (len || 1) * 16, sy = dx / (len || 1) * 16;
  for (let k = 0; k <= n; k++) {
    const x = p.x + dx * k / n, y = p.y + dy * k / n;
    if (isLand(x, y) || isLand(x + sx, y + sy) || isLand(x - sx, y - sy)) return false;
  }
  return true;
}

// A path of waypoints from `from` to `to` through open water, or null if there is none.
export function findPath(from, to) {
  const ok = freeGrid(), s = cellOf(from.x, from.y), t = cellOf(to.x, to.y);
  const g = new Float32Array(gw * gh).fill(Infinity), came = new Int32Array(gw * gh).fill(-1);
  const tc = centre(t), hcost = c => { const p = centre(c); return Math.hypot(p.x - tc.x, p.y - tc.y); };
  const heap = [[hcost(s), s]]; g[s] = 0;
  const push = e => { heap.push(e); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= e[0]) break; heap[i] = heap[p]; i = p; } heap[i] = e; };
  const pop = () => {
    const top = heap[0], e = heap.pop();
    if (heap.length) {
      let i = 0;
      for (;;) { let m = 2 * i + 1; if (m >= heap.length) break; if (m + 1 < heap.length && heap[m + 1][0] < heap[m][0]) m++; if (heap[m][0] >= e[0]) break; heap[i] = heap[m]; i = m; }
      heap[i] = e;
    }
    return top;
  };
  let found = false;
  while (heap.length) {
    const [, c] = pop();
    if (c === t) { found = true; break; }
    const ci = c % gw, cj = Math.floor(c / gw);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= gw || nj >= gh) continue;
      const n = nj * gw + ni;
      if (!ok[n] && n !== t) continue; // the start and finish cells may be close to the shore
      const ng = g[c] + (di && dj ? Math.SQRT2 : 1) * CELL;
      if (ng < g[n]) { g[n] = ng; came[n] = c; push([ng + hcost(n), n]); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let c = t; c !== -1 && c !== s; c = came[c]) cells.push(c);
  const pts = [from, ...cells.reverse().slice(0, -1).map(centre), to];
  // straighten: from each point, jump to the furthest later point reachable in a clear straight run
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1;) {
    let j = pts.length - 1;
    while (j > i + 1 && !clearRun(pts[i], pts[j])) j--;
    out.push(pts[j]); i = j;
  }
  return out;
}

// --- Motion ------------------------------------------------------------------------------------------------
export function stepCommittee(dt) {
  const c = committee, boat = game.boat;
  if (c.state === 'start') {
    c.h = game.windFrom; // anchored: lies head to wind
    if (game.state === 'racing' && game.objIdx >= 1) {
      const target = game.course.finishBoat, path = findPath(c, target);
      if (path) { c.path = path; c.wp = 1; c.state = 'motoring'; }
      else { console.warn('No water route for the start boat to the finish'); Object.assign(c, target, { state: 'finish' }); }
    }
  } else if (c.state === 'motoring') {
    const p = c.path[c.wp], last = c.wp === c.path.length - 1;
    const dx = p.x - c.x, dy = p.y - c.y, dist = Math.hypot(dx, dy);
    const err = norm(Math.atan2(dx, -dy) - c.h);
    c.h = norm(c.h + clamp(err, -TURN * dt, TURN * dt));
    // slow for sharp turns and for the final approach; give way to the player's boat close ahead
    const bx = boat.x - c.x, by = boat.y - c.y, ahead = bx * Math.sin(c.h) - by * Math.cos(c.h);
    const giveWay = ahead > 0 && Math.hypot(bx, by) < 90;
    const target = giveWay ? 0 : SPEED * Math.max(0.2, Math.cos(err)) * (last ? Math.min(1, dist / 150 + 0.1) : 1);
    c.v += (target - c.v) * Math.min(1, dt * 1.5);
    const step = Math.min(c.v * dt, dist);
    c.x += Math.sin(c.h) * step; c.y -= Math.cos(c.h) * step;
    if (last ? dist < 4 : dist < 30) {
      if (last) { c.x = p.x; c.y = p.y; c.v = 0; c.state = 'finish'; } else c.wp++;
    }
    c.wakeT += dt;
    if (c.wakeT > 0.08) { c.wakeT = 0; c.wake.push({ x: c.x, y: c.y }); if (c.wake.length > 60) c.wake.shift(); }
  } else {
    c.h = norm(c.h + norm(game.windFrom - c.h) * Math.min(1, dt * 0.6)); // anchored: swing to head to wind
    if (c.wake.length) c.wake.shift();
  }
}
