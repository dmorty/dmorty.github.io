// RSYS Saturday courses, Divisions 1-3, from the 2026-2027 Spring & Summer Series Sailing Instructions (clause 7.1).
// Mark lines are copied verbatim from the sheet: marks are left to starboard unless suffixed (P); * is the shortened-course mark.
// AS buoy positions are from the Australian Sailing marks lat/long list (July 2025). Marks with "approx": true have no
// published position and are placed from the Appendix 3 descriptions. Start and finish positions are "in the vicinity of".
// The object below is strict JSON so tools/check_courses.py can read it.
window.RSYS = {
  "season": "2026-2027 Spring & Summer Series",
  "marks": {
    "MW": { "name": "Manly West", "lat": -33.80288, "lon": 151.27698 },
    "ME": { "name": "Manly East", "lat": -33.80322, "lon": 151.27885 },
    "CP": { "name": "Cannae Point", "lat": -33.81365, "lon": 151.28258 },
    "LB": { "name": "Lady Bay", "lat": -33.83460, "lon": 151.27700 },
    "BB": { "name": "Beashel Buoy", "lat": -33.83887, "lon": 151.26975 },
    "EC": { "name": "Eastern Channel", "lat": -33.84065, "lon": 151.27082 },
    "NP": { "name": "Nielsen Park", "lat": -33.84843, "lon": 151.26585 },
    "SM": { "name": "Shark Mark", "lat": -33.86015, "lon": 151.25953 },
    "RB": { "name": "Rose Bay East", "lat": -33.86237, "lon": 151.26630 },
    "PP": { "name": "Point Piper", "lat": -33.86263, "lon": 151.25128 },
    "TB": { "name": "Taylors Bay", "lat": -33.84830, "lon": 151.24870 },
    "CBS": { "name": "Chowder Bay South", "lat": -33.84222, "lon": 151.25572 },
    "CBN": { "name": "Chowder Bay North", "lat": -33.83905, "lon": 151.26022 },
    "OB": { "name": "Obelisk Bay", "lat": -33.83075, "lon": 151.26635 },
    "KP": { "name": "Kirribilli Point", "lat": -33.8515, "lon": 151.2247, "approx": true },
    "DM": { "name": "Darling Point", "lat": -33.8602, "lon": 151.2380, "approx": true },
    "N2": { "name": "Naval Buoy No. 2", "lat": -33.8606, "lon": 151.2387, "approx": true },
    "N3": { "name": "Naval Buoy No. 3", "lat": -33.8602, "lon": 151.2412, "approx": true },
    "DB": { "name": "Double Bay", "lat": -33.8635, "lon": 151.2466, "approx": true },
    "RM": { "name": "Rose Bay", "lat": -33.8622, "lon": 151.2621, "approx": true }
  },
  "starts": {
    "Clarke Island": { "lat": -33.8590, "lon": 151.2425 },
    "Kirribilli": { "lat": -33.8510, "lon": 151.2270 },
    "Athol Bay": { "lat": -33.8540, "lon": 151.2420 },
    "Shark Island": { "lat": -33.8585, "lon": 151.2545 }
  },
  "finishes": {
    "Nielsen Park": { "lat": -33.8490, "lon": 151.2640 },
    "Woollahra Point": { "lat": -33.8640, "lon": 151.2580 },
    "Point Piper": { "lat": -33.8628, "lon": 151.2528 },
    "Kirribilli": { "lat": -33.8512, "lon": 151.2262 }
  },
  "winds": [
    { "name": "N", "bearing": 0, "course": 0 },
    { "name": "NNE", "bearing": 22.5, "course": 0 },
    { "name": "NE", "bearing": 45, "course": 1 },
    { "name": "ENE", "bearing": 67.5, "course": 1 },
    { "name": "E", "bearing": 90, "course": 2 },
    { "name": "SE", "bearing": 135, "course": 3 },
    { "name": "S", "bearing": 180, "course": 4 },
    { "name": "SW", "bearing": 225, "course": 5 },
    { "name": "W", "bearing": 270, "course": 6 },
    { "name": "NW", "bearing": 315, "course": 7 }
  ],
  "divisions": {
    "1": [
      { "start": "Clarke Island", "marks": "MW – ME – *N3 – CP – N3", "finish": "Nielsen Park", "nm": 16.0 },
      { "start": "Clarke Island", "marks": "CP – *N3 – CP – N3", "finish": "Nielsen Park", "nm": 14.4 },
      { "start": "Kirribilli", "marks": "SM – KP(P) – SM – *KP(P) – SM – KP(P)", "finish": "Woollahra Point", "nm": 12 },
      { "start": "Kirribilli", "marks": "DB(P) – OB – RM – CBS – RM – *KP(P) – RM – KP(P)", "finish": "Woollahra Point", "nm": 15.9 },
      { "start": "Athol Bay", "marks": "DB(P) – MW – ME – *EC – MW – ME", "finish": "Woollahra Point", "nm": 14.2 },
      { "start": "Athol Bay", "marks": "DM(P) – MW – ME – DM(P) – *LB – SM – LB", "finish": "Point Piper", "nm": 16 },
      { "start": "Shark Island", "marks": "KP(P) – SM – KP(P) – *SM – KP(P) – RM(P)", "finish": "Kirribilli", "nm": 13.0 },
      { "start": "Clarke Island", "marks": "KP(P) – PP – KP(P) – RM(P) – KP(P) – *SM– KP(P) – RM(P)", "finish": "Kirribilli", "nm": 13.3 }
    ],
    "2": [
      { "start": "Clarke Island", "marks": "OB – SM – *PP – OB - SM – N3", "finish": "Nielsen Park", "nm": 11.3 },
      { "start": "Clarke Island", "marks": "CP – *N3 – EC – N3", "finish": "Nielsen Park", "nm": 12 },
      { "start": "Kirribilli", "marks": "SM – KP(P) - SM– *N3 – SM – KP(P)", "finish": "Woollahra Point", "nm": 10.7 },
      { "start": "Kirribilli", "marks": "DB(P) – KP(P) – RB – *KP(P) – RB - TB", "finish": "Woollahra Point", "nm": 12.1 },
      { "start": "Athol Bay", "marks": "DB (P) – MW – *ME – PP – OB", "finish": "Woollahra Point", "nm": 12.1 },
      { "start": "Athol Bay", "marks": "DM(P) – EC – PP – *EC – PP – EC", "finish": "Point Piper", "nm": 10.7 },
      { "start": "Shark Island", "marks": "KP(P) – SM – KP(P) – *SM) – KP(P) – SM", "finish": "Kirribilli", "nm": 11.8 },
      { "start": "Clarke Island", "marks": "KP(P) – RB – KP(P) – *N3 - KP(P) – RB", "finish": "Kirribilli", "nm": 12.3 }
    ],
    "3": [
      { "start": "Clarke Island", "marks": "BB – PP – NP – *N3 – BB – SM – PP", "finish": "Nielsen Park", "nm": 10.0 },
      { "start": "Clarke Island", "marks": "BB – PP – NP – *N3 – BB – SM – PP", "finish": "Nielsen Park", "nm": 10.0 },
      { "start": "Kirribilli", "marks": "RM(P) – N3 – SM – *KP(P) – SM – N3", "finish": "Woollahra Point", "nm": 9.4 },
      { "start": "Kirribilli", "marks": "DB(P) – KP(P) – N3 – *KP(P) – SM – KP(P)", "finish": "Woollahra Point", "nm": 9.0 },
      { "start": "Athol Bay", "marks": "DB(P) – OB – NP – CBS – *SM – OB – SM", "finish": "Woollahra Point", "nm": 10.2 },
      { "start": "Athol Bay", "marks": "DM(P) – BB – PP – *NP – PP – NP", "finish": "Point Piper", "nm": 9.8 },
      { "start": "Shark Island", "marks": "KP(P) – PP – KP(P) – *SM – KP(P) – SM", "finish": "Kirribilli", "nm": 10.2 },
      { "start": "Clarke Island", "marks": "KP(P) –  *RM(P) – KP(P) - RM(P)", "finish": "Kirribilli", "nm": 9.0 }
    ]
  }
};
