// The course minimap: land, the course, the visible area, the sailed track and the boat.
import { C } from './util.js';
import { W, H, landPath } from './chart.js';
import { drawCourse } from './render.js';
import { game } from './game.js';
import { view } from './camera.js';

export function drawMinimap() {
  const { mctx: c, dpr, ms, cam, zoom, cw, ch } = view, { boat, track } = game, s = ms / W;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, ms, ms);
  c.fillStyle = C['--sea']; c.globalAlpha = 0.25; c.fillRect(0, 0, ms, ms); c.globalAlpha = 1;
  c.save(); c.scale(s, s);
  c.beginPath(); c.rect(0, 0, W, H); c.clip();

  c.fillStyle = C['--land']; c.globalAlpha = 0.85; c.fill(landPath, 'evenodd'); c.globalAlpha = 1;

  drawCourse(c, 1 / s, true);

  // viewport
  c.strokeStyle = 'rgba(234,244,242,.3)'; c.lineWidth = 1 / s;
  c.strokeRect(cam.x - cw / 2 / zoom, cam.y - ch / 2 / zoom, cw / zoom, ch / zoom);

  // sailed course since the start
  if (track.length > 1) {
    c.strokeStyle = 'rgba(251,250,245,.6)'; c.lineWidth = 1.2 / s; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(track[0].x, track[0].y);
    for (const p of track) c.lineTo(p.x, p.y);
    c.lineTo(boat.x, boat.y);
    c.stroke();
  }
  c.restore();

  // boat (screen units so it stays legible)
  c.save(); c.translate(boat.x * s, boat.y * s); c.rotate(boat.h);
  c.fillStyle = C['--sail']; c.strokeStyle = C['--ink']; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, -6); c.lineTo(4, 4); c.lineTo(-4, 4); c.closePath(); c.fill(); c.stroke();
  c.restore();

  c.strokeStyle = 'rgba(234,244,242,.5)'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, ms - 1, ms - 1);
}
