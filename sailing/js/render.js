// Drawing the main chart view: sea, land, grid, place names, the course, the boat and the wind streaks.
import { DEG, C } from './util.js';
import { MAP, W, H, landPath, lonAt, latAt, soundings } from './chart.js';
import { MARKS } from './course.js';
import { NOGO, optimalSheet } from './boat.js';
import { particles } from './wind.js';
import { game } from './game.js';
import { view } from './camera.js';

export function drawWorld(info) {
  const { ctx, cw, ch, dpr, cam, zoom } = view, { boat, windFrom, course, objIdx } = game;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C['--sea']; ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  if (zoom === 1) ctx.translate(Math.round(cw / 2 - cam.x), Math.round(ch / 2 - cam.y));
  else { ctx.translate(cw / 2, ch / 2); ctx.scale(zoom, zoom); ctx.translate(-cam.x, -cam.y); }

  // shallow band along the shore, then soundings (chart convention: italic depth figures)
  ctx.strokeStyle = C['--sea-shallow']; ctx.lineWidth = 50; ctx.lineJoin = 'round'; ctx.stroke(landPath);
  ctx.fillStyle = C['--ink-soft']; ctx.font = 'italic 11px JetBrains Mono, monospace';
  for (const s of soundings) ctx.fillText(s.d, s.x, s.y);
  // land
  ctx.fillStyle = C['--land']; ctx.fill(landPath, 'evenodd');
  ctx.strokeStyle = C['--ink']; ctx.lineWidth = 1.5; ctx.stroke(landPath);
  // chart grid at every 0.01° of real latitude/longitude
  ctx.strokeStyle = 'rgba(18,50,59,.12)'; ctx.lineWidth = 1;
  ctx.font = '10px JetBrains Mono, monospace'; ctx.fillStyle = C['--ink-soft'];
  for (let lon = Math.ceil(MAP.lon0 * 100) / 100; lon <= lonAt(W); lon += 0.01) {
    const x = (lon - MAP.lon0) / MAP.lonPerUnit;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    ctx.fillText(`${lon.toFixed(2)}°E`, x + 4, 14);
  }
  for (let lat = Math.floor(-MAP.latTop * 100) / 100; lat <= -latAt(H); lat += 0.01) {
    const y = (MAP.latTop + lat) / MAP.latPerUnit;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillText(`${lat.toFixed(2)}°S`, 4, y - 4);
  }
  // place names
  ctx.textAlign = 'center';
  for (const l of MAP.labels) {
    ctx.font = l.kind === 'water' ? 'italic 15px Atkinson Hyperlegible, sans-serif' : '700 12px Atkinson Hyperlegible, sans-serif';
    ctx.fillStyle = l.kind === 'water' ? C['--ink-soft'] : C['--ink'];
    ctx.fillText(l.kind === 'water' ? l.text : l.text.toUpperCase(), l.x, l.y);
  }
  ctx.textAlign = 'start';
  // boundary
  ctx.strokeStyle = C['--ink']; ctx.lineWidth = 3; ctx.strokeRect(0, 0, W, H);

  drawCourse(ctx, 1, false);

  // wake
  ctx.strokeStyle = 'rgba(251,250,245,.8)';
  for (let i = 1; i < boat.wake.length; i++) {
    ctx.lineWidth = 1 + i / 30; ctx.globalAlpha = i / boat.wake.length;
    ctx.beginPath(); ctx.moveTo(boat.wake[i - 1].x, boat.wake[i - 1].y); ctx.lineTo(boat.wake[i].x, boat.wake[i].y); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // no-go wedge
  ctx.save(); ctx.translate(boat.x, boat.y);
  ctx.fillStyle = info.twa < NOGO ? 'rgba(210,69,47,.22)' : 'rgba(18,50,59,.09)';
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.arc(0, 0, 95, windFrom - Math.PI / 2 - NOGO * DEG, windFrom - Math.PI / 2 + NOGO * DEG); ctx.closePath(); ctx.fill();
  ctx.restore();

  // pointer to next mark
  if (game.state === 'racing') {
    const m = course.objs[objIdx];
    const a = Math.atan2(m.y - boat.y, m.x - boat.x);
    ctx.save(); ctx.translate(boat.x + Math.cos(a) * 52, boat.y + Math.sin(a) * 52); ctx.rotate(a);
    ctx.fillStyle = objCol(m); ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.fill();
    ctx.restore();
  }

  drawBoat(info);
  ctx.restore();

  // wind streaks in screen space
  ctx.strokeStyle = 'rgba(251,250,245,.55)'; ctx.lineWidth = 1.2;
  const bx = -Math.sin(windFrom), by = Math.cos(windFrom);
  for (const p of particles) {
    const x = p.x * cw, y = p.y * ch;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - bx * p.l, y - by * p.l); ctx.stroke();
  }
}

const objCol = o => o.kind !== 'mark' ? C['--amber'] : o.port ? C['--red'] : C['--green']; // port red, starboard green

// Course overlay for the chart and the minimap. u = world units per on-screen unit, so sizes stay legible on the minimap.
export function drawCourse(c, u, mini) {
  const { course, objIdx, t } = game;
  const racing = game.state === 'racing', objs = course.objs, cur = objs[objIdx];
  const dash = mini ? 60 : 10, lw = mini ? u : 2;
  // the whole course, with the current leg picked out
  c.setLineDash([dash, dash]); c.strokeStyle = mini ? 'rgba(234,244,242,.35)' : 'rgba(18,50,59,.25)'; c.lineWidth = lw;
  c.beginPath(); course.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
  if (racing && objIdx > 0) {
    const a = course.pts[objIdx - 1], b = course.pts[objIdx];
    c.strokeStyle = mini ? 'rgba(234,244,242,.9)' : 'rgba(18,50,59,.65)'; c.lineWidth = lw * 1.5;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  }
  c.setLineDash([]);

  // start and finish lines
  c.font = '700 13px Atkinson Hyperlegible, sans-serif';
  [objs[0], objs[objs.length - 1]].forEach((o, k) => {
    c.globalAlpha = racing && (k ? objs.length - 1 : 0) < objIdx ? 0.3 : 1;
    c.strokeStyle = mini ? C['--amber'] : C['--ink']; c.lineWidth = mini ? 2 * u : 3;
    if (!mini) c.setLineDash([6, 6]);
    c.beginPath(); c.moveTo(o.a.x, o.a.y); c.lineTo(o.b.x, o.b.y); c.stroke(); c.setLineDash([]);
    if (!mini) {
      c.fillStyle = C['--amber'];
      for (const e of [o.a, o.b]) { c.beginPath(); c.arc(e.x, e.y, 9, 0, 7); c.fill(); }
      c.fillStyle = C['--ink']; c.fillText(k ? 'Finish' : 'Start', o.b.x + 14, o.b.y - 12);
    }
    c.globalAlpha = 1;
  });

  // marks: every charted buoy, with the ones on this course coloured by the side of their next rounding
  for (const m of MARKS) {
    if (!course.codes.has(m.code)) {
      if (mini) continue;
      c.fillStyle = 'rgba(18,50,59,.22)'; c.beginPath(); c.arc(m.x, m.y, 7, 0, 7); c.fill();
      c.fillStyle = C['--ink-soft']; c.font = '700 11px Atkinson Hyperlegible, sans-serif'; c.fillText(m.code, m.x + 11, m.y - 9);
      continue;
    }
    const next = objs.find((o, i) => o.kind === 'mark' && o.code === m.code && (!racing || i >= objIdx));
    const active = racing && cur.kind === 'mark' && cur.code === m.code;
    if (active) {
      c.strokeStyle = objCol(cur); c.lineWidth = mini ? 1.5 * u : 2; c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
      c.beginPath(); c.arc(m.x, m.y, mini ? 7 * u : 40, 0, 7); c.stroke();
      if (!mini) { c.setLineDash([8, 6]); c.beginPath(); c.moveTo(cur.a.x, cur.a.y); c.lineTo(cur.b.x, cur.b.y); c.stroke(); c.setLineDash([]); } // rounding gate
      c.globalAlpha = 1;
    }
    c.fillStyle = next ? objCol(next) : mini ? 'rgba(159,192,192,.4)' : 'rgba(18,50,59,.3)';
    c.beginPath(); c.arc(m.x, m.y, mini ? 3.5 * u : 13, 0, 7); c.fill();
    if (mini) continue;
    c.strokeStyle = C['--sail']; c.lineWidth = 2; c.stroke();
    c.fillStyle = C['--ink']; c.font = '700 13px Atkinson Hyperlegible, sans-serif';
    c.fillText(active ? `${m.code} · leave to ${cur.port ? 'port' : 'starboard'}` : m.code, m.x + 18, m.y - 16);
  }
}

function drawBoat(info) {
  const { ctx } = view, { boat, t } = game;
  ctx.save(); ctx.translate(boat.x, boat.y); ctx.rotate(boat.h);
  // hull
  ctx.fillStyle = C['--sail']; ctx.strokeStyle = C['--ink']; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -24);
  ctx.bezierCurveTo(11, -12, 11, 10, 8, 18); ctx.lineTo(-8, 18);
  ctx.bezierCurveTo(-11, 10, -11, -12, 0, -24); ctx.fill(); ctx.stroke();
  // rudder
  ctx.save(); ctx.translate(0, 18); ctx.rotate(-boat.rudder * 0.5);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 9); ctx.stroke(); ctx.restore();
  // sail: boom swings to leeward
  const side = info.rel > 0 ? -1 : 1;
  const b = Math.min(boat.sheet, info.twa) * DEG;
  const L = 30;
  const mx = 0, my = -8;
  const ex = side * Math.sin(b) * L, ey = my + Math.cos(b) * L;
  const luff = info.twa < NOGO || boat.sheet > optimalSheet(info.twa) + 8;
  const bulge = luff ? Math.sin(t * 38) * 4 : 7 * Math.min(1, info.eff + 0.2);
  const nx = -(ey - my) / L, ny = (ex - mx) / L;
  const cx = (mx + ex) / 2 + nx * bulge * -side, cy = (my + ey) / 2 + ny * bulge * -side;
  ctx.fillStyle = 'rgba(251,250,245,.95)';
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = luff ? C['--amber'] : C['--ink']; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C['--ink'];
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.fillStyle = C['--ink']; ctx.beginPath(); ctx.arc(mx, my, 3, 0, 7); ctx.fill();
  ctx.restore();
}
