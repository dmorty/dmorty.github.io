// Boat physics: the speed polar, sail trim, steering, movement, running aground, wake and sailed track.
import { DEG, norm, clamp } from './util.js';
import { W, H, isLand } from './chart.js';
import { game } from './game.js';

export const MAXV = 150;

// Polar: fraction of max speed by true wind angle (degrees)
export const NOGO = 30; // no-go zone: degrees either side of the wind the boat cannot sail
export function polar(twa) {
  if (twa < NOGO) return 0;
  if (twa < 60) return 0.75 * (twa - NOGO) / (60 - NOGO);
  if (twa < 105) return 0.75 + 0.25 * (twa - 60) / 45;
  return 1 - 0.35 * (twa - 105) / 75;
}
export const optimalSheet = twa => clamp(twa / 2, 8, 88);
export function trimEff(sheet, twa) {
  const opt = optimalSheet(twa);
  if (sheet < opt) return Math.max(0, 1 - (opt - sheet) / 40);
  return Math.max(0, 1 - (sheet - opt) / 22);
}

// One physics step. Returns the sailing info for drawing and the HUD ({ twa, rel, eff }, measured before this
// step's steering), the position before the move, and whether the boat hit land.
export function stepBoat(dt, racing) {
  const { boat, input } = game;
  const rel = norm(game.windFrom - boat.h);
  const twa = Math.abs(rel) / DEG;

  if (racing) {
    const r = input.right - input.left;
    boat.rudder += (r - boat.rudder) * Math.min(1, dt * 6);
    boat.h = norm(boat.h + boat.rudder * (0.35 + 1.3 * boat.v / MAXV) * dt);
    if (game.auto) boat.sheet += (optimalSheet(twa) - boat.sheet) * Math.min(1, dt * 3);
    else boat.sheet = clamp(boat.sheet + (input.ease - input.trim) * 55 * dt, 0, 90);
  }
  const eff = trimEff(boat.sheet, twa);
  const target = racing ? MAXV * game.windStr * polar(twa) * eff : 0;
  boat.v += (target - boat.v) * dt * (target > boat.v ? 0.55 : 0.9);
  boat.v *= 1 - Math.abs(boat.rudder) * 0.2 * dt;
  const px = boat.x, py = boat.y;
  boat.x += Math.sin(boat.h) * boat.v * dt;
  boat.y -= Math.cos(boat.h) * boat.v * dt;
  let aground = false;
  if (isLand(boat.x, boat.y) || isLand(boat.x + Math.sin(boat.h) * 22, boat.y - Math.cos(boat.h) * 22)) {
    boat.x = px; boat.y = py; boat.v *= 0.2;
    aground = true;
  }
  if (boat.x < 40 || boat.x > W - 40 || boat.y < 40 || boat.y > H - 40) {
    boat.x = clamp(boat.x, 40, W - 40); boat.y = clamp(boat.y, 40, H - 40); boat.v *= 0.5;
  }
  game.wakeT += dt;
  if (game.wakeT > 0.06) { game.wakeT = 0; boat.wake.push({ x: boat.x, y: boat.y }); if (boat.wake.length > 110) boat.wake.shift(); }
  if (racing) {
    const p = game.track[game.track.length - 1];
    if (Math.hypot(boat.x - p.x, boat.y - p.y) > 12) game.track.push({ x: boat.x, y: boat.y });
  }
  return { info: { twa, rel, eff }, px, py, aground };
}
