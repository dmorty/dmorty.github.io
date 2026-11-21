// Input: keyboard, the on-screen helm buttons, and map navigation (drag, wheel and pinch).
import { $ } from './util.js';
import { game } from './game.js';
import { view, zoomAt, clampCam, recenter, detach } from './camera.js';
import { soundOn, setSound } from './sound.js';
import { toast } from './ui.js';

const keymap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'trim', w: 'trim', W: 'trim', ArrowDown: 'ease', s: 'ease', S: 'ease' };

export function initInput({ startRace }) {
  const { input } = game, { canvas } = view;
  addEventListener('keydown', e => {
    if (keymap[e.key]) { input[keymap[e.key]] = 1; e.preventDefault(); }
    if (e.key === 'Enter' && game.state !== 'racing') startRace();
    if (e.key === '+' || e.key === '=') zoomAt(1.25, view.cw / 2, view.ch / 2);
    if (e.key === '-' || e.key === '_') zoomAt(0.8, view.cw / 2, view.ch / 2);
    if (e.key === 'c' || e.key === 'C') recenter();
    if (e.key === 'm' || e.key === 'M') { setSound(!soundOn()); $('sound').checked = soundOn(); toast(soundOn() ? 'Sound on' : 'Sound off'); }
  });
  addEventListener('keyup', e => { if (keymap[e.key]) input[keymap[e.key]] = 0; });
  document.querySelectorAll('.btn').forEach(b => {
    const a = b.dataset.act;
    const on = e => { e.preventDefault(); input[a] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} };
    const off = () => { input[a] = 0; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  $('autotrim').addEventListener('change', e => game.auto = e.target.checked);
  $('recenter').addEventListener('click', recenter);

  // Map navigation: wheel / trackpad pinch zooms, drag pans, two-finger pinch zooms and pans
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
    if (view.follow) zoomAt(f, view.cw / 2, view.ch / 2); else zoomAt(f, e.clientX, e.clientY);
  }, { passive: false });
  const ptrs = new Map();
  let dragged = false;
  const pinch = () => { const [a, b] = [...ptrs.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; };
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    dragged = false;
  });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const { cam } = view;
    if (ptrs.size === 1) {
      if (!dragged && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 4) return;
      if (!dragged) { dragged = true; detach(); canvas.classList.add('dragging'); }
      cam.x -= (e.clientX - p.x) / view.zoom; cam.y -= (e.clientY - p.y) / view.zoom; clampCam();
      p.x = e.clientX; p.y = e.clientY;
    } else if (ptrs.size === 2) {
      const before = pinch();
      p.x = e.clientX; p.y = e.clientY;
      const after = pinch();
      if (before.d > 0) zoomAt(after.d / before.d, after.x, after.y);
      if (Math.hypot(after.x - before.x, after.y - before.y) > 0.5) detach();
      cam.x -= (after.x - before.x) / view.zoom; cam.y -= (after.y - before.y) / view.zoom; clampCam();
    }
  });
  const endPtr = e => {
    ptrs.delete(e.pointerId);
    // re-anchor any remaining finger so a lift mid-pinch doesn't jump the view
    for (const q of ptrs.values()) { q.x0 = q.x; q.y0 = q.y; }
    if (!ptrs.size) canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  $('start').addEventListener('click', startRace);
}
