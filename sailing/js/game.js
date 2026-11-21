// Shared mutable game state. Modules import this one object and read or change its fields
// (an imported binding can't be reassigned, so state that changes lives here).
export const game = {
  course: null,      // the current course, from course.js buildCourse()
  boat: null,        // { x, y, h, v, drift, rudder, sheet, wake }; drift = sideways speed, + to starboard
  state: 'ready',    // 'ready' | 'racing' | 'finished'
  objIdx: 0,         // next start line / mark / finish in course.objs
  t: 0,              // seconds since load
  raceT: 0,          // race clock
  windFrom: 0,       // radians, the direction the wind blows from
  windStr: 1,        // fraction of full strength
  wakeT: 0,
  groundT: -9,       // when the last "Aground!" toast showed
  track: [],         // full sailed course for the minimap, reset each race
  auto: false,       // auto-trim
  input: { left: 0, right: 0, trim: 0, ease: 0 },
};
