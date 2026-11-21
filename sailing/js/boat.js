// Boat physics: the speed polar, sail trim, steering, movement, running aground, wake and sailed track.
import { DEG, norm, clamp } from './util.js';
import { W, H, isLand } from './chart.js';
import { game } from './game.js';
import { hitsCommittee } from './committee.js';

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

// Leeway: the wind on the sail also pushes the boat sideways, away from the wind. The keel resists it better the
// faster the boat goes, so a slow boat slips most. LEEWAY is the sideways speed (world units/s) of a stopped boat,
// close-hauled in full wind: about 5° of leeway at close-hauled racing speed.
export const LEEWAY = 14;
export function leewayFactor(twa) {
  if (twa < NOGO) return twa / NOGO;            // fading out head to wind, where the sail just flaps
  return clamp((150 - twa) / (150 - 45), 0, 1); // most close-hauled, none on a run
}

// One physics step. Returns the sailing info for drawing and the HUD ({ twa, rel, eff }, measured before this
// step's steering), the position before the move, and whether the boat hit land or the start boat.
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
  // sideways speed, positive to starboard; leeward is to port when the wind comes over the starboard side (rel > 0)
  const drift = racing ? -Math.sign(rel) * LEEWAY * game.windStr * leewayFactor(twa) * (1 - 0.65 * Math.min(1, boat.v / MAXV)) : 0;
  boat.drift += (drift - boat.drift) * Math.min(1, dt * 1.5);
  const px = boat.x, py = boat.y;
  boat.x += (Math.sin(boat.h) * boat.v + Math.cos(boat.h) * boat.drift) * dt;
  boat.y += (-Math.cos(boat.h) * boat.v + Math.sin(boat.h) * boat.drift) * dt;
  let aground = false, hitBoat = false;
  const bowX = boat.x + Math.sin(boat.h) * 22, bowY = boat.y - Math.cos(boat.h) * 22;
  if (isLand(boat.x, boat.y) || isLand(bowX, bowY)) aground = true;
  else if (hitsCommittee(boat.x, boat.y) || hitsCommittee(bowX, bowY)) hitBoat = true;
  if (aground || hitBoat) { boat.x = px; boat.y = py; boat.v *= 0.2; boat.drift *= 0.2; }
  if (boat.x < 40 || boat.x > W - 40 || boat.y < 40 || boat.y > H - 40) {
    boat.x = clamp(boat.x, 40, W - 40); boat.y = clamp(boat.y, 40, H - 40); boat.v *= 0.5;
  }
  game.wakeT += dt;
  if (game.wakeT > 0.06) { game.wakeT = 0; boat.wake.push({ x: boat.x, y: boat.y }); if (boat.wake.length > 110) boat.wake.shift(); }
  if (racing) {
    const p = game.track[game.track.length - 1];
    if (Math.hypot(boat.x - p.x, boat.y - p.y) > 12) game.track.push({ x: boat.x, y: boat.y });
  }
  return { info: { twa, rel, eff }, px, py, aground, hitBoat };
}
