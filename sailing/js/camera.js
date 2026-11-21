// The view: canvas sizes, and a camera that follows the boat or can be panned and zoomed.
import { clamp } from './util.js';
import { W, H } from './chart.js';
import { game } from './game.js';

const canvas = document.getElementById('game');
const mini = document.getElementById('mini');
export const view = {
  canvas, ctx: canvas.getContext('2d'),
  mini, mctx: mini.getContext('2d'),
  cw: 0, ch: 0, dpr: 1, ms: 0,  // canvas size in CSS px, device pixel ratio, minimap size
  cam: { x: 0, y: 0 },          // world point at the centre of the screen
  zoom: 1,
  follow: true,                 // the camera tracks the boat; false once the player pans
};
export function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.cw = canvas.clientWidth; view.ch = canvas.clientHeight;
  canvas.width = view.cw * view.dpr; canvas.height = view.ch * view.dpr;
  view.ms = mini.clientWidth;
  mini.width = mini.height = view.ms * view.dpr;
}
window.addEventListener('resize', resize); resize();

const ZMAX = 3;
const minZoom = () => Math.min(1, Math.min(view.cw / W, view.ch / H) * 0.9);
const EDGE = 60; // screen px the boat is kept inside the frame edge
export function clampCam() {
  const { cam, zoom } = view, boat = game.boat;
  cam.x = clamp(cam.x, 0, W); cam.y = clamp(cam.y, 0, H);
  // then keep the boat in frame; this wins over the map bounds (the boat is always on the map, so both can hold)
  const rx = Math.max(0, view.cw / 2 - EDGE) / zoom, ry = Math.max(0, view.ch / 2 - EDGE) / zoom;
  cam.x = clamp(cam.x, boat.x - rx, boat.x + rx); cam.y = clamp(cam.y, boat.y - ry, boat.y + ry);
}
export function zoomAt(f, sx, sy) {
  const { cam, cw, ch } = view;
  const wx = cam.x + (sx - cw / 2) / view.zoom, wy = cam.y + (sy - ch / 2) / view.zoom;
  view.zoom = clamp(view.zoom * f, minZoom(), ZMAX);
  cam.x = wx - (sx - cw / 2) / view.zoom; cam.y = wy - (sy - ch / 2) / view.zoom;
  clampCam();
}
export function recenter() { view.follow = true; view.zoom = 1; }
export function detach() { view.follow = false; }

// camera with look-ahead, unless the player has panned away
export function followBoat(dt) {
  const { cam } = view, boat = game.boat;
  if (view.follow) {
    const lx = boat.x + Math.sin(boat.h) * boat.v * 0.7, ly = boat.y - Math.cos(boat.h) * boat.v * 0.7;
    cam.x += (lx - cam.x) * Math.min(1, dt * 2.5);
    cam.y += (ly - cam.y) * Math.min(1, dt * 2.5);
  } else clampCam(); // boat keeps sailing: drag the free camera along so it never leaves the frame
}
