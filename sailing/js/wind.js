// Wind: slow shifts in direction and strength around the course's breeze, and the streaks that show it.
import { rnd } from './chart.js';
import { game } from './game.js';
import { view } from './camera.js';

export function stepWind() {
  const t = game.t;
  game.windFrom = game.course.windBase + 0.22 * Math.sin(t * 0.045) + 0.09 * Math.sin(t * 0.13 + 1);
  game.windStr = 0.85 + 0.15 * Math.sin(t * 0.07 + 2);
}

// wind streaks (screen-normalised coords)
export const particles = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), l: 10 + rnd() * 18 }));
export function moveParticles(dt) {
  const bx = -Math.sin(game.windFrom), by = Math.cos(game.windFrom);
  const sp = 0.12 * game.windStr * dt;
  for (const p of particles) {
    p.x += bx * sp * (view.ch / Math.max(view.cw, 1)); p.y += by * sp;
    if (p.x < -0.05) p.x += 1.1; if (p.x > 1.05) p.x -= 1.1;
    if (p.y < -0.05) p.y += 1.1; if (p.y > 1.05) p.y -= 1.1;
  }
}
