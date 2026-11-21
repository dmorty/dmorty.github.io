// The page around the chart: the HUD, toasts, the course setup card, the finish card and best times.
import { $, DEG, clamp, fmt, stored, store } from './util.js';
import { RS, buildCourse, sheetLine } from './course.js';
import { NOGO, optimalSheet } from './boat.js';
import { game } from './game.js';
import { view } from './camera.js';

let toastTimer;
export function toast(msg) { const el = $('toast'); el.textContent = msg; el.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => el.style.opacity = 0, 1200); }

// Course picker on the start card
const setup = Object.assign({ division: '1', wind: 'NE', shortened: false, kirribilli: false }, stored('rsysSetup', {}));
const bests = stored('rsysBest', {}); // best time per course key
const rcPick = () => RS.winds[Math.floor(Math.random() * RS.winds.length)].name;
let rcWind = rcPick(); // the breeze when the wind choice is "Race committee's pick"
export const setupCourse = () => buildCourse({ ...setup, wind: setup.wind === 'RC' ? rcWind : setup.wind });
let resetBoat = () => {};

function renderSheet() {
  const c = game.course, b = bests[c.key];
  $('sheet').innerHTML = `<b>Division ${c.division} · Course ${c.num} · ${c.wind.name} wind</b><br>`
    + `Start: vicinity of ${c.startName}<br>${sheetLine(c)}<br>`
    + `Finish: vicinity of ${c.finishName}${c.shortened ? ' (shortened at *)' : ''}<br>`
    + `${c.modified ? 'About' : 'Approximately'} ${c.nm.toFixed(1)} nm${b ? ` · best ${fmt(b)}` : ''}`;
}
function applySetup() {
  game.course = setupCourse();
  store('rsysSetup', setup);
  if (game.state !== 'racing') resetBoat(); // show the new start area behind the card
  renderSheet();
}
// Wire up the start card. Call after game.course is built; onReset puts the boat back at the course's start.
export function initSetup(onReset) {
  resetBoat = onReset;
  $('division').innerHTML = Object.keys(RS.divisions).map(d => `<option value="${d}">Division ${d}</option>`).join('');
  $('windsel').innerHTML = `<option value="RC">Race committee's pick</option>`
    + RS.winds.map(w => `<option value="${w.name}">${w.name} (course ${w.course})</option>`).join('');
  if (!RS.divisions[setup.division]) setup.division = Object.keys(RS.divisions)[0];
  if (setup.wind !== 'RC' && !RS.winds.some(w => w.name === setup.wind)) setup.wind = 'RC';
  $('division').value = setup.division; $('windsel').value = setup.wind;
  $('shortened').checked = !!setup.shortened; $('kirribilli').checked = !!setup.kirribilli;
  $('division').addEventListener('change', e => { setup.division = e.target.value; applySetup(); });
  $('windsel').addEventListener('change', e => { setup.wind = e.target.value; if (setup.wind === 'RC') rcWind = rcPick(); applySetup(); });
  $('shortened').addEventListener('change', e => { setup.shortened = e.target.checked; applySetup(); });
  $('kirribilli').addEventListener('change', e => { setup.kirribilli = e.target.checked; applySetup(); });
  renderSheet();
}

export function finish() {
  game.state = 'finished';
  const c = game.course, raceT = game.raceT, prev = bests[c.key], rec = !prev || raceT < prev;
  if (rec) { bests[c.key] = raceT; store('rsysBest', bests); }
  $('headline').textContent = rec ? 'New best time' : 'Finished';
  $('result').textContent = fmt(raceT); $('result').hidden = false;
  $('blurb').textContent = `Division ${c.division}, course ${c.num} in a ${c.wind.name} breeze${c.shortened ? ', shortened' : ''}. Best: ${fmt(bests[c.key])}. Tip: upwind, sail at about 60° to the wind and tack as few times as you can.`;
  $('help').hidden = true; $('tips').hidden = true;
  $('start').textContent = 'Race again';
  if (setup.wind === 'RC') { rcWind = rcPick(); applySetup(); } else renderSheet(); // a new pick from the race committee for the next race
  $('overlay').hidden = false;
}

export function updateHud({ twa, eff }) {
  const { boat, course } = game;
  const offDefault = !view.follow || view.zoom !== 1; // Recenter shows whenever the view isn't the default boat-follow at 1×
  if ($('recenter').hidden === offDefault) $('recenter').hidden = !offDefault;
  $('spd').innerHTML = `${(boat.v / 12).toFixed(1)}<small>kn</small>`;
  $('wind').innerHTML = `${Math.round(game.windStr * 14)}<small>kn</small> ${Math.round(twa)}°`;
  $('warrow').style.transform = `rotate(${game.windFrom / DEG}deg)`;
  $('time').textContent = fmt(game.raceT);
  $('next').textContent = game.state === 'racing' ? `${game.objIdx}/${course.objs.length - 1} ${course.objs[game.objIdx].label}` : '—';
  const opt = optimalSheet(twa);
  const z0 = clamp(opt - 12, 0, 90), z1 = clamp(opt + 8, 0, 90);
  $('zone').style.left = (z0 / 90 * 100) + '%';
  $('zone').style.width = ((z1 - z0) / 90 * 100) + '%';
  $('needle').style.left = (boat.sheet / 90 * 100) + '%';
  let st;
  if (twa < NOGO) st = 'In irons: bear away from the wind';
  else if (boat.sheet > opt + 8) st = 'Luffing: trim in ↑';
  else if (boat.sheet < opt - 12) st = 'Over-trimmed: ease ↓';
  else st = 'Sail drawing well';
  $('trimstate').textContent = st;
  $('trimstate').style.color = twa < NOGO || eff < 0.6 ? 'var(--amber)' : 'var(--on-panel)';
}
