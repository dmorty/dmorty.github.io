// Sound effects, synthesised with the Web Audio API (no audio files).
// Browsers only allow sound after the player interacts, so the audio context starts on the first key or tap.
import { stored, store } from './util.js';

let ac = null, out = null;
let on = stored('rsysSound', 'on') !== 'off';

function unlock() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { capture: true });

export const soundOn = () => on;
export function setSound(v) { on = v; store('rsysSound', v ? 'on' : 'off'); }

// one tone: oscillator type, start and end frequency (Hz), length (s), peak gain, delay (s), attack (s)
function tone(type, f0, f1, len, peak, delay = 0, attack = 0.01) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + len + 0.05);
}
// a race committee horn: two detuned saws through a low-pass filter
function horn(len, delay = 0) {
  const t = ac.currentTime + delay, f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.05);
  g.gain.setValueAtTime(0.25, t + len - 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  f.connect(g); g.connect(out);
  for (const hz of [196, 197.5]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz;
    o.connect(f); o.start(t); o.stop(t + len + 0.05);
  }
}
// a short burst of low-passed noise, for the hull hitting the shore
function thump(len) {
  const t = ac.currentTime, n = Math.ceil(ac.sampleRate * len);
  const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter();
  src.buffer = buf; f.type = 'lowpass'; f.frequency.value = 300;
  src.connect(f); f.connect(out); src.start(t);
}

const SOUNDS = {
  go: () => horn(0.7),                                                     // start signal
  started: () => tone('sine', 880, 880, 0.18, 0.2),                        // crossed the start line
  mark: () => { tone('sine', 1320, 1320, 0.9, 0.25); tone('sine', 2640, 2640, 0.5, 0.06); }, // mark rounded: a bell
  wrong: () => { tone('square', 140, 120, 0.14, 0.08); tone('square', 140, 120, 0.14, 0.08, 0.18); }, // wrong side
  aground: () => { thump(0.35); tone('sine', 90, 45, 0.3, 0.5); },
  finish: () => { horn(0.35); horn(0.9, 0.45); },                          // finish gun: short, then long
};

export function play(name) {
  if (!on || !ac || ac.state === 'closed') return; // while the context is still starting, sounds queue up and play when it runs
  SOUNDS[name]();
}
