// ── Tile & grid constants (shared globally) ───────────────────────────────
const COLS   = 15;
const ROWS   = 11;
const TW     = 48;   // tile width
const TH     = 24;   // tile height
const HALF_W = 24;
const HALF_H = 12;
const TD     = 8;    // tile 3-D depth

const T_GRASS = 0;
const T_PATH  = 1;
const T_WATER = 2;
const T_ROCK  = 3;
const T_TREE  = 4;

// Build a tile map from waypoints + optional decoration list
function buildMap(waypoints, decos) {
  const map = Array.from({length: ROWS}, () => new Array(COLS).fill(T_GRASS));

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [c1, r1] = waypoints[i];
    const [c2, r2] = waypoints[i + 1];
    if (c1 === c2) {
      for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++)
        if (c1 >= 0 && c1 < COLS && r >= 0 && r < ROWS) map[r][c1] = T_PATH;
    } else {
      for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++)
        if (c >= 0 && c < COLS && r1 >= 0 && r1 < ROWS) map[r1][c] = T_PATH;
    }
  }
  for (const [c, r, t] of decos)
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS && map[r][c] === T_GRASS)
      map[r][c] = t;

  return map;
}

// ── Level definitions ─────────────────────────────────────────────────────
const LEVELS = [
  // ── Level 1: The Misty Valley ─────────────────────────────────────────
  {
    id: 0,
    name: 'The Misty Valley',
    desc: 'Goblin tribes descend from the mist-shrouded peaks. Hold the line!',
    theme: 'valley',
    startGold: 200, lives: 20,
    waypoints: [[-1,2],[3,2],[3,7],[10,7],[10,2],[15,2]],
    decos: [
      [0,0,T_TREE],[1,0,T_TREE],[5,0,T_TREE],[8,0,T_TREE],[12,0,T_TREE],[14,0,T_TREE],
      [0,5,T_WATER],[1,5,T_WATER],[0,6,T_WATER],[1,6,T_WATER],
      [6,9,T_TREE],[7,9,T_TREE],[8,9,T_TREE],
      [14,9,T_ROCK],[13,9,T_ROCK],[0,10,T_ROCK],
      [4,4,T_TREE],[5,4,T_TREE],[13,5,T_TREE],[14,5,T_TREE],
    ],
    waves: [
      [{type:'goblin',  count:8,  interval:1200}],
      [{type:'goblin',  count:12, interval:1000}],
      [{type:'goblin',  count:6,  interval:1000},
       {type:'orc',     count:3,  interval:2000, delay:6000}],
      [{type:'goblin',  count:10, interval:900},
       {type:'orc',     count:5,  interval:1800, delay:6000}],
      [{type:'orc',     count:5,  interval:1800},
       {type:'troll',   count:1,  interval:0,    delay:9000}],
    ],
  },

  // ── Level 2: The Dark Forest ───────────────────────────────────────────
  {
    id: 1,
    name: 'The Dark Forest',
    desc: 'Cursed creatures prowl the ancient woodland. They grow bolder…',
    theme: 'forest',
    startGold: 175, lives: 20,
    waypoints: [[-1,1],[2,1],[2,5],[7,5],[7,1],[11,1],[11,8],[15,8]],
    decos: [
      [0,3,T_TREE],[1,3,T_TREE],[0,4,T_TREE],[1,4,T_TREE],
      [4,0,T_TREE],[5,0,T_TREE],[6,0,T_TREE],
      [9,3,T_TREE],[10,3,T_TREE],[9,4,T_TREE],
      [13,0,T_TREE],[14,0,T_TREE],
      [3,8,T_WATER],[4,8,T_WATER],[3,9,T_WATER],[4,9,T_WATER],
      [12,5,T_ROCK],[13,5,T_ROCK],[12,6,T_ROCK],
      [0,9,T_ROCK],[1,9,T_ROCK],
      [9,9,T_TREE],[10,9,T_TREE],[13,10,T_TREE],
    ],
    waves: [
      [{type:'goblin',  count:10, interval:1000},
       {type:'darkelf', count:5,  interval:1500, delay:5000}],
      [{type:'orc',     count:8,  interval:1800},
       {type:'darkelf', count:6,  interval:1200, delay:6000}],
      [{type:'goblin',  count:15, interval:800},
       {type:'orc',     count:4,  interval:2000, delay:6000},
       {type:'darkelf', count:3,  interval:1500, delay:11000}],
      [{type:'troll',   count:2,  interval:5000},
       {type:'orc',     count:10, interval:1500, delay:4000}],
      [{type:'goblin',  count:20, interval:700},
       {type:'darkelf', count:10, interval:1200, delay:7000}],
      [{type:'orc',     count:5,  interval:2000},
       {type:'troll',   count:2,  interval:5000, delay:5000},
       {type:'darkelf', count:8,  interval:1200, delay:3000}],
    ],
  },

  // ── Level 3: The Dragon's Keep ─────────────────────────────────────────
  {
    id: 2,
    name: "The Dragon's Keep",
    desc: 'The ancient stronghold awakens. A fearsome power stirs within…',
    theme: 'volcanic',
    startGold: 150, lives: 20,
    waypoints: [[-1,3],[2,3],[2,8],[6,8],[6,1],[10,1],[10,6],[13,6],[13,9],[15,9]],
    decos: [
      [0,0,T_ROCK],[1,0,T_ROCK],[0,1,T_ROCK],[1,1,T_ROCK],
      [4,4,T_ROCK],[5,4,T_ROCK],[4,5,T_ROCK],
      [8,3,T_ROCK],[9,3,T_ROCK],
      [11,7,T_ROCK],[12,7,T_ROCK],
      [14,3,T_ROCK],[14,4,T_ROCK],[14,5,T_ROCK],[14,6,T_ROCK],
      [3,0,T_WATER],[4,0,T_WATER],[3,1,T_WATER],
      [0,5,T_WATER],[0,6,T_WATER],[1,6,T_WATER],
      [7,9,T_WATER],[8,9,T_WATER],[7,10,T_WATER],
    ],
    waves: [
      [{type:'goblin',  count:15, interval:800},
       {type:'darkelf', count:8,  interval:1200, delay:5000}],
      [{type:'orc',     count:10, interval:1500},
       {type:'troll',   count:5,  interval:4000, delay:6000}],
      [{type:'goblin',  count:20, interval:700},
       {type:'orc',     count:8,  interval:1500, delay:6000},
       {type:'darkelf', count:6,  interval:1200, delay:11000}],
      [{type:'troll',   count:4,  interval:4500},
       {type:'orc',     count:15, interval:1200, delay:5000}],
      [{type:'darkelf', count:20, interval:800},
       {type:'troll',   count:3,  interval:4500, delay:8000}],
      [{type:'goblin',  count:30, interval:600},
       {type:'orc',     count:10, interval:1300, delay:8000},
       {type:'darkelf', count:5,  interval:1200, delay:12000}],
      [{type:'troll',   count:3,  interval:4500},
       {type:'orc',     count:20, interval:1200, delay:4000},
       {type:'darkelf', count:10, interval:1000, delay:8000}],
      [{type:'boss',    count:1,  interval:0},
       {type:'orc',     count:10, interval:1200, delay:5000},
       {type:'goblin',  count:10, interval:800,  delay:8000}],
    ],
  },
];

// Pre-build maps
LEVELS.forEach(lvl => { lvl.map = buildMap(lvl.waypoints, lvl.decos); });
