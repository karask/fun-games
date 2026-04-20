// ── Rendering offsets (updated on resize) ────────────────────────────────
let OFFSET_X = 0, OFFSET_Y = 0;

// Convert grid (col,row) → tile bounding-box top-left (bx, by)
function gridToBB(col, row) {
  return {
    bx: (col - row) * DHW + OFFSET_X,
    by: (col + row) * DHH + OFFSET_Y,
  };
}

// Centre of the top-face diamond
function gridCenter(col, row) {
  const {bx,by}=gridToBB(col,row);
  return { x: bx+DHW, y: by+DHH };
}

// Screen click → grid cell
function screenToGrid(mx, my) {
  if(DHW===0||DHH===0) return {col:-1,row:-1};
  const x = mx - OFFSET_X, y = my - OFFSET_Y;
  return {
    col: Math.floor((x/DHW + y/DHH) / 2),
    row: Math.floor((y/DHH - x/DHW) / 2),
  };
}

// Dynamic tile size (recalculated on resize)
let DTW = 48, DTH = 24, DHW = 24, DHH = 12;

// Recompute OFFSET_X/Y to centre the isometric grid on the canvas
function updateOffsets() {
  if(!canvas) return;

  // Target: use 90% of the smaller canvas dimension, with correct aspect
  // gridW = (COLS+ROWS-2)*HALF_W + TW  =>  (COLS+ROWS-1)*HALF_W
  // gridH = (COLS+ROWS-2)*HALF_H + TH  =>  (COLS+ROWS-1)*HALF_H
  // We solve for HALF_W such that gridW fits in 90% of canvas width
  // and gridH fits in 90% of canvas height, taking the smaller scale.
  const maxW = canvas.width  * 0.92;
  const maxH = canvas.height * 0.90;
  const halfWbyW = maxW / (COLS + ROWS - 1);
  const halfHbyH = maxH / (COLS + ROWS - 1);
  // keep 2:1 ratio (HALF_H = HALF_W / 2)
  const halfW = Math.floor(Math.min(halfWbyW, halfHbyH * 2));
  const halfH = Math.floor(halfW / 2);
  DTW = halfW * 2; DTH = halfH * 2; DHW = halfW; DHH = halfH;

  const gridW = (COLS + ROWS - 2) * DHW + DTW;
  const gridH = (COLS + ROWS - 2) * DHH + DTH + TD;
  OFFSET_X = Math.floor((canvas.width  - gridW) / 2 + (ROWS - 1) * DHW);
  OFFSET_Y = Math.max(8, Math.floor((canvas.height - gridH) / 2));
}

// ── Tile colours per theme ────────────────────────────────────────────────
const THEMES = {
  valley:   { grass:['#56a35a','#3e7c40','#326632'], path:['#c9a458','#9a7a3a','#7d622e'], water:['#4488cc','#2266aa','#1a5590'], rock:['#787878','#585858','#444444'], treeTile:['#3e7040','#2a5030','#1e4028'] },
  forest:   { grass:['#2e6b32','#1f5022','#183c1a'], path:['#8a6b3a','#66502a','#4e3d1e'], water:['#3a6999','#2a5080','#1e3e66'], rock:['#555565','#404050','#333344'], treeTile:['#1e5025','#163a1a','#0e2a12'] },
  volcanic: { grass:['#4a3228','#362218','#2a1a10'], path:['#8b4a30','#6a3420','#521a08'], water:['#993300','#7a2200','#5e1800'], rock:['#6a5a50','#4e4238','#3a2e28'], treeTile:['#3a2820','#2a1a14','#1e1008'] },
};

// ── Draw one isometric tile ───────────────────────────────────────────────
function drawTile(ctx, col, row, tileType, theme) {
  const {bx,by} = gridToBB(col,row);
  const T = THEMES[theme] || THEMES.valley;
  let [top,left,right] = T.grass;
  if(tileType===T_PATH)  [top,left,right]=T.path;
  if(tileType===T_WATER) [top,left,right]=T.water;
  if(tileType===T_ROCK)  [top,left,right]=T.rock;
  if(tileType===T_TREE)  [top,left,right]=T.treeTile;

  // animated water shimmer
  if(tileType===T_WATER) {
    const sh=Math.sin(Date.now()*0.002+col*0.8+row*0.6)*0.08;
    top=shiftBrightness(top,sh);
  }

  const hw=DHW, hh=DHH, tw=DTW, th=DTH;
  // TOP FACE
  ctx.fillStyle=top;
  ctx.beginPath();
  ctx.moveTo(bx+hw, by);
  ctx.lineTo(bx+tw, by+hh);
  ctx.lineTo(bx+hw, by+th);
  ctx.lineTo(bx,    by+hh);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.13)'; ctx.lineWidth=0.4; ctx.stroke();

  // LEFT FACE (depth)
  ctx.fillStyle=left;
  ctx.beginPath();
  ctx.moveTo(bx,    by+hh);
  ctx.lineTo(bx+hw, by+th);
  ctx.lineTo(bx+hw, by+th+TD);
  ctx.lineTo(bx,    by+hh+TD);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // RIGHT FACE (depth)
  ctx.fillStyle=right;
  ctx.beginPath();
  ctx.moveTo(bx+hw, by+th);
  ctx.lineTo(bx+tw, by+hh);
  ctx.lineTo(bx+tw, by+hh+TD);
  ctx.lineTo(bx+hw, by+th+TD);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

// Shift hex colour brightness by -1..1 fraction
function shiftBrightness(hex, frac) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const cl=v=>Math.max(0,Math.min(255,Math.round(v+v*frac)));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}

// ── Draw tree decoration ──────────────────────────────────────────────────
function drawTreeDeco(ctx, col, row, theme) {
  const {bx,by} = gridToBB(col,row);
  const cx=bx+DHW, cy=by+DHH;
  const sc=DTW/48; // scale relative to base tile size
  const isVolcanic = theme==='volcanic';
  const trunkColor = isVolcanic ? '#5a3020' : '#6b4423';
  const leaf1 = isVolcanic ? '#5a2800' : (theme==='forest' ? '#1a5020' : '#2d7a1e');
  const leaf2 = isVolcanic ? '#3a1800' : (theme==='forest' ? '#124018' : '#3ca825');

  // trunk
  ctx.fillStyle=trunkColor; ctx.fillRect(cx-3*sc,cy-14*sc,6*sc,16*sc);
  // foliage layers
  ctx.fillStyle=leaf1;
  ctx.beginPath(); ctx.arc(cx,cy-20*sc,(isVolcanic?9:14)*sc,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=leaf2;
  ctx.beginPath(); ctx.arc(cx-3*sc,cy-26*sc,(isVolcanic?6:9)*sc,0,Math.PI*2); ctx.fill();
}

// ── Draw rock decoration ──────────────────────────────────────────────────
function drawRockDeco(ctx, col, row, theme) {
  const {bx,by} = gridToBB(col,row);
  const cx=bx+DHW, cy=by+DHH;
  const sc=DTW/48;
  const c1=theme==='volcanic'?'#8a6a50':theme==='forest'?'#606070':'#909090';
  const c2=theme==='volcanic'?'#6a4030':theme==='forest'?'#404050':'#686868';
  ctx.fillStyle=c1;
  ctx.beginPath(); ctx.ellipse(cx-3*sc,cy-5*sc,9*sc,7*sc,0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=c2;
  ctx.beginPath(); ctx.ellipse(cx+5*sc,cy-2*sc,6*sc,5*sc,-0.2,0,Math.PI*2); ctx.fill();
}

// ── Base crystal (goal) ────────────────────────────────────────────────────
function drawBaseCrystal(ctx) {
  if(!G) return;
  const lvl=LEVELS[G.levelIdx];
  const lastWP=lvl.waypoints[lvl.waypoints.length-1];
  const exitCol=Math.min(COLS-1, lastWP[0]);
  const {bx,by}=gridToBB(exitCol, lastWP[1]);
  const cx=bx+DHW, cy=by+DHH-18;
  const t=Date.now()*0.002;
  const sc=DTW/48;
  ctx.save();
  ctx.shadowBlur=18+Math.sin(t)*6; ctx.shadowColor='#88aaff';
  ctx.fillStyle=`hsl(${220+Math.sin(t)*20},80%,70%)`;
  ctx.beginPath();
  ctx.moveTo(cx,       cy-20*sc);
  ctx.lineTo(cx+10*sc, cy-5*sc);
  ctx.lineTo(cx+7*sc,  cy+10*sc);
  ctx.lineTo(cx-7*sc,  cy+10*sc);
  ctx.lineTo(cx-10*sc, cy-5*sc);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(cx-2*sc, cy-18*sc); ctx.lineTo(cx+5*sc, cy-5*sc); ctx.lineTo(cx,cy-5*sc); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── Range circle for selected/inspected tower ─────────────────────────────
function drawRangeCircle(ctx, col, row, range) {
  const {x,y}=gridCenter(col,row);
  // scale range with tile size
  const scaledRange = range * (DTW / 48);
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.35)';
  ctx.lineWidth=1.5;
  ctx.setLineDash([6,4]);
  ctx.beginPath(); ctx.arc(x,y,scaledRange,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.arc(x,y,scaledRange,0,Math.PI*2); ctx.fill();
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Hover highlight ────────────────────────────────────────────────────────
function drawHoverHighlight(ctx, col, row, canPlace) {
  const {bx,by}=gridToBB(col,row);
  ctx.save();
  ctx.globalAlpha=0.45;
  ctx.fillStyle=canPlace?'#88ff88':'#ff4444';
  ctx.beginPath();
  ctx.moveTo(bx+DHW, by);
  ctx.lineTo(bx+DTW, by+DHH);
  ctx.lineTo(bx+DHW, by+DTH);
  ctx.lineTo(bx,     by+DHH);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── Full scene render ──────────────────────────────────────────────────────
function renderFrame() {
  if(!ctx||!canvas) return;

  // Background gradient
  const bg=ctx.createLinearGradient(0,0,0,canvas.height);
  if(!G||G.phase==='menu'){
    bg.addColorStop(0,'#0d0f1a'); bg.addColorStop(1,'#1a1030');
  } else {
    const theme=(G&&LEVELS[G.levelIdx])?LEVELS[G.levelIdx].theme:'valley';
    if(theme==='valley'){ bg.addColorStop(0,'#1a2a3a'); bg.addColorStop(1,'#0e1a20'); }
    else if(theme==='forest'){ bg.addColorStop(0,'#0a150a'); bg.addColorStop(1,'#050d05'); }
    else { bg.addColorStop(0,'#1a0505'); bg.addColorStop(1,'#0d0000'); }
  }
  ctx.fillStyle=bg; ctx.fillRect(0,0,canvas.width,canvas.height);

  if(!G || G.phase==='menu') return;

  const lvl=LEVELS[G.levelIdx];
  const theme=lvl.theme;
  const map=lvl.map;

  // Draw tiles in diagonal back-to-front order
  for(let sum=0;sum<COLS+ROWS-1;sum++) {
    for(let col=0;col<COLS;col++) {
      const row=sum-col;
      if(row<0||row>=ROWS) continue;
      const tType=map[row][col];
      drawTile(ctx,col,row,tType,theme);

      // decorations on top of tile
      if(tType===T_TREE) drawTreeDeco(ctx,col,row,theme);
      if(tType===T_ROCK) drawRockDeco(ctx,col,row,theme);

      // hover highlight
      if(G.hoverCell && G.hoverCell.col===col && G.hoverCell.row===row && G.selectedTowerType) {
        const canPlace=tType===T_GRASS&&!G.towers.find(t=>t.col===col&&t.row===row);
        drawHoverHighlight(ctx,col,row,canPlace);
      }

      // range circle for selected tower (if inspecting)
      if(G.inspectedTower && G.inspectedTower.col===col && G.inspectedTower.row===row) {
        const td=TOWER_DEFS[G.inspectedTower.type];
        const stats=td.levels[G.inspectedTower.level];
        drawRangeCircle(ctx,col,row,stats.range);
      }

      // draw tower
      const tower=G.towers.find(t=>t.col===col&&t.row===row);
      if(tower) drawTower(ctx, gridToBB(col,row).bx, gridToBB(col,row).by, tower.type, tower.level);
    }
  }

  // Base crystal
  drawBaseCrystal(ctx);

  // Monsters sorted front-to-back (larger y drawn last)
  const sorted=[...G.monsters].sort((a,b)=>a.y-b.y);
  for(const m of sorted) drawMonster(ctx,m);

  // Projectiles
  for(const p of G.projectiles) drawProjectile(ctx,p);

  // Particles
  for(const p of G.particles) drawParticle(ctx,p);
}
