// RSYS course sheet (rsys-courses.js): marks projected onto the chart, and a generator that turns a sheet line into a course
import { DEG, norm, unit } from './util.js';
import { MAP, isLand, toXY, reach } from './chart.js';

export const RS = window.RSYS;
export const MARKS = Object.entries(RS.marks).map(([code, m]) => ({ code, name: m.name, ...toXY(m) }));
const markAt = code => MARKS.find(m => m.code === code);
for (const m of MARKS) if (isLand(m.x, m.y)) console.warn(`Mark ${m.code} is charted on land`);
const LINE = 70, GATE = 160; // half-length of the start/finish lines; length of a mark's rounding gate (world units)

// "DB(P) – *KP(P) - SM" → marks in order; (P) = leave to port (otherwise starboard), * = shortened-course mark
export function parseMarks(line) {
  return line.split(/\s*[–—-]\s*/).map(tok => {
    const m = /^(\*?)\s*([A-Z][A-Z0-9]*)\s*(\(P\))?\)?$/.exec(tok.trim());
    if (!m || !markAt(m[2])) throw new Error(`Unknown mark "${tok}" in "${line}"`);
    return { code: m[2], port: !!m[3], short: !!m[1] };
  });
}
export function buildCourse({ division, wind, shortened, kirribilli }) {
  const w = RS.winds.find(x => x.name === wind) || RS.winds[0];
  if (!RS.divisions[division]) division = Object.keys(RS.divisions)[0];
  const def = RS.divisions[division][w.course];
  let list = parseMarks(def.marks);
  if (shortened) list = list.slice(0, list.findIndex(m => m.short) + 1); // flag S: finish after the * mark
  const finishName = kirribilli ? 'Kirribilli' : def.finish;             // flag O: Kirribilli finish
  const wb = w.bearing * DEG, up = { x: Math.sin(wb), y: -Math.cos(wb) }; // up: unit vector pointing upwind
  const s = toXY(RS.starts[def.start]), f = toXY(RS.finishes[finishName]);
  const legs = list.map(m => ({ ...m, ...markAt(m.code) }));
  const pts = [s, ...legs, f], last = legs[legs.length - 1];
  // a line across direction dir, centred on c and stopping short of the shore; it is crossed by sailing along dir
  const line = (c, dir) => {
    const ra = reach(c, { x: dir.y, y: -dir.x }, LINE), rb = reach(c, { x: -dir.y, y: dir.x }, LINE);
    return { x: c.x, y: c.y, dir, a: { x: c.x + dir.y * ra, y: c.y - dir.x * ra }, b: { x: c.x - dir.y * rb, y: c.y + dir.x * rb } };
  };
  const objs = [{ kind: 'start', label: 'Start line', ...line(s, up) }]; // start line square to the wind
  legs.forEach((m, i) => {
    // Rounding gate: a ray from the mark along the outside of the turn. The mark counts when the boat crosses it
    // while circling the mark the right way (anticlockwise on the chart = mark left to port).
    const A = pts[i], B = pts[i + 2];
    const uin = unit(m.x - A.x, m.y - A.y), uout = unit(B.x - m.x, B.y - m.y);
    let g = { x: uin.x - uout.x, y: uin.y - uout.y };
    if (Math.hypot(g.x, g.y) < 0.2) g = m.port ? { x: -uin.y, y: uin.x } : { x: uin.y, y: -uin.x }; // straight on: gate abeam, on the boat's side
    g = unit(g.x, g.y);
    const room = reach(m, g, GATE), len = Math.max(30, room); // gate stops at the shore
    if (room < 30) console.warn(`${m.code} of division ${division} course ${w.course} is hard against the shore`);
    objs.push({ kind: 'mark', label: m.code + (m.port ? ' (P)' : ''), ...m, a: { x: m.x + g.x * 10, y: m.y + g.y * 10 }, b: { x: m.x + g.x * len, y: m.y + g.y * len } });
  });
  objs.push({ kind: 'finish', label: 'Finish', ...line(f, unit(f.x - last.x, f.y - last.y)) });
  for (const o of [objs[0], objs[objs.length - 1]]) if (Math.hypot(o.a.x - o.b.x, o.a.y - o.b.y) < LINE) console.warn(`${o.label} of division ${division} course ${w.course} is squeezed by the shore`);
  let back = 70; while (back > 20 && isLand(s.x - up.x * back, s.y - up.y * back)) back -= 10;
  const modified = shortened || finishName !== def.finish;
  const charted = pts.slice(1).reduce((d, p, i) => d + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0) * MAP.mPerUnit / 1852;
  return {
    key: `${division}-${w.name}${shortened ? '-S' : ''}${finishName !== def.finish ? '-O' : ''}`,
    division, num: w.course, wind: w, windBase: wb, list, objs, pts, shortened, modified,
    startName: def.start, finishName, nm: modified ? charted : def.nm, codes: new Set(list.map(m => m.code)),
    spawn: { x: s.x - up.x * back, y: s.y - up.y * back, h: norm(wb - 50 * DEG) }, // behind the line, close-hauled on starboard tack
  };
}

// The course's mark line as printed on the sheet
export const sheetLine = c => c.list.map(m => (m.short ? '*' : '') + m.code + (m.port ? '(P)' : '')).join(' – ');
