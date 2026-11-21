// Entry point: sets up the first course and boat, runs the race (start, objectives, finish) and the frame loop.
import { $, cr, segHit } from './util.js';
import { game } from './game.js';
import { stepBoat } from './boat.js';
import { stepWind, moveParticles } from './wind.js';
import { view, recenter, followBoat } from './camera.js';
import { initInput } from './input.js';
import { toast, setupCourse, initSetup, finish, updateHud } from './ui.js';
import { drawWorld } from './render.js';
import { drawMinimap } from './minimap.js';
import { play } from './sound.js';

game.course = setupCourse();
game.boat = { ...game.course.spawn, v: 0, drift: 0, rudder: 0, sheet: 30, wake: [] };
game.windFrom = game.course.windBase;
view.cam.x = game.boat.x; view.cam.y = game.boat.y - 100;

function resetBoat() {
  const { boat, course } = game;
  Object.assign(boat, { ...course.spawn, v: 0, drift: 0, rudder: 0, sheet: 30, wake: [] });
  game.track = [{ x: boat.x, y: boat.y }];
  recenter(); view.cam.x = boat.x; view.cam.y = boat.y;
}
function startRace() {
  resetBoat();
  game.objIdx = 0; game.raceT = 0; game.state = 'racing';
  $('overlay').hidden = true;
  toast('Go!'); play('go');
}

initInput({ startRace });
initSetup(resetBoat);

function update(dt) {
  game.t += dt;
  stepWind();

  const racing = game.state === 'racing';
  if (racing) game.raceT += dt;
  const { info, px, py, aground } = stepBoat(dt, racing);
  if (aground && racing && game.t - game.groundT > 2) { game.groundT = game.t; toast('Aground!'); play('aground'); }

  // next objective: cross the start line upwind, round the mark on its required side, or cross the finish line
  if (racing) {
    const boat = game.boat, o = game.course.objs[game.objIdx], dx = boat.x - px, dy = boat.y - py;
    if (segHit({ x: px, y: py }, boat, o.a, o.b)) {
      const ok = o.kind === 'mark' ? (cr(px - o.x, py - o.y, dx, dy) < 0) === o.port : dx * o.dir.x + dy * o.dir.y > 0;
      if (!ok) { if (o.kind === 'mark') { toast(`Leave ${o.code} to ${o.port ? 'port' : 'starboard'}`); play('wrong'); } }
      else if (o.kind === 'finish') { play('finish'); finish(); }
      else { toast(o.kind === 'start' ? 'Started' : `${o.code} ✓`); play(o.kind === 'start' ? 'started' : 'mark'); game.objIdx++; }
    }
  }

  followBoat(dt);
  moveParticles(dt);
  updateHud(info);
  return info;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const info = update(dt);
  drawWorld(info);
  drawMinimap();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
