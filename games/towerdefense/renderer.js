// ── Rendering offsets (updated on resize) ────────────────────────────────
// Simulation uses a fixed world. Only the camera changes with the viewport.
let OFFSET_X = (ROWS - 1) * 36 + 80, OFFSET_Y = 110;
let VIEW_SCALE = 1, VIEW_X = 0, VIEW_Y = 0;
let cameraZoom = 1, cameraPanX = 0, cameraPanY = 0;
let viewWidth = 1000, viewHeight = 600, pixelRatio = 1;
function worldToScreen(x, y) { return { x: x * VIEW_SCALE + VIEW_X, y: y * VIEW_SCALE + VIEW_Y }; }
function screenToWorld(x, y) { return { x: (x - VIEW_X) / VIEW_SCALE, y: (y - VIEW_Y) / VIEW_SCALE }; }

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
  const p = screenToWorld(mx, my);
  const x = p.x - OFFSET_X - DHW, y = p.y - OFFSET_Y;
  return {
    col: Math.floor((x/DHW + y/DHH) / 2),
    row: Math.floor((y/DHH - x/DHW) / 2),
  };
}

// Dynamic tile size (recalculated on resize)
const DTW = 72, DTH = 36, DHW = 36, DHH = 18;

// Recompute OFFSET_X/Y to centre the isometric grid on the canvas
function updateOffsets() {
  if(!canvas) return;

  const worldWidth = (COLS + ROWS) * DHW + 160;
  const worldHeight = (COLS + ROWS) * DHH + 160;
  VIEW_SCALE = Math.max(0.1, Math.min(viewWidth / worldWidth, viewHeight / worldHeight)) * cameraZoom;
  VIEW_X = (viewWidth - worldWidth * VIEW_SCALE) / 2 + cameraPanX;
  VIEW_Y = (viewHeight - worldHeight * VIEW_SCALE) / 2 + cameraPanY;
}

const THEMES = {
  valley: {grass:'#6f8550',path:'#b9a575',edge:'#657644',soil:'#665e47',water:'#527f83',sky:['#354c45','#213b35']},
  forest: {grass:'#475f40',path:'#968963',edge:'#405737',soil:'#4e5140',water:'#406c70',sky:['#263f37','#142a24']},
  volcanic: {grass:'#746751',path:'#ac8a62',edge:'#655c45',soil:'#4b453a',water:'#a25534',sky:['#453d31','#2c3028']},
};
let terrainLayer = null, terrainLevel = -1;
function shiftBrightness(hex, amount) {
  const rgb=[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*(1+amount)))));
  return `rgb(${rgb.join(',')})`;
}
function diamondPath(c,col,row,inset=0) {
  const p=gridCenter(col,row);c.beginPath();c.moveTo(p.x,p.y-DHH+inset);c.lineTo(p.x+DHW-inset,p.y);c.lineTo(p.x,p.y+DHH-inset);c.lineTo(p.x-DHW+inset,p.y);c.closePath();
}
function drawGroundTile(c,col,row,tile,theme) {
  const p=gridCenter(col,row),T=THEMES[theme],seed=artSeed(col,row),path=tile===T_PATH,water=tile===T_WATER;
  const depth=32+Math.floor(seed*5);
  // Only the island rim has exposed earth. Interior tiles meet without seams.
  const edges=[];
  if(row===ROWS-1)edges.push([[p.x-DHW,p.y],[p.x,p.y+DHH]]);
  if(col===COLS-1)edges.push([[p.x,p.y+DHH],[p.x+DHW,p.y]]);
  for(const corners of edges) {
    const [a,b]=corners;
    artPoly(c,[a,b,[b[0],b[1]+depth],[a[0],a[1]+depth]],a[1]<b[1]?T.soil:shiftBrightness(T.soil,-.2));
    artLine(c,[[a[0],a[1]+12],[b[0],b[1]+12]],'#c4b08130',2);
    for(let k=0;k<4;k++) {const f=(k+.3)/4,x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f;artLine(c,[[x,y+4],[x+3,y+12],[x-2,y+24]],'#25382d44',1);}
    artPoly(c,[a,b,[b[0],b[1]+5],[a[0],a[1]+6]],T.edge);
  }
  diamondPath(c,col,row);c.fillStyle=shiftBrightness(water?T.water:path?T.path:T.grass,(seed-.5)*.085);c.fill();
  c.save();c.clip();
  if(water) {
    const g=c.createLinearGradient(p.x-DHW,p.y-DHH,p.x+DHW,p.y+DHH);g.addColorStop(0,'#192e3544');g.addColorStop(1,'#abd9c333');c.fillStyle=g;c.fillRect(p.x-DHW,p.y-DHH,DTW,DTH);
    c.strokeStyle=theme==='volcanic'?'#e39a5055':'#c4d5bd55';c.lineWidth=2;c.stroke();
  } else if(path) {
    for(let k=0;k<12;k++) {
      const x=p.x+(artSeed(col*23+k,row)-.5)*DTW,y=p.y+(artSeed(col,row*21+k)-.5)*DTH;
      const w=4+artSeed(k,col+row)*9;
      artPoly(c,[[x-w,y],[x-1,y-w*.45],[x+w,y],[x+1,y+w*.4]],shiftBrightness(T.path,(artSeed(k,row)-.5)*.32),'#76674828');
    }
  } else {
    for(let k=0;k<18;k++) {
      const x=p.x+(artSeed(col*23+k,row)-.5)*DTW,y=p.y+(artSeed(col,row*21+k)-.5)*DTH;
      if(theme==='volcanic') {artLine(c,[[x-4,y-1],[x+3,y],[x+5,y+3]],'#403f3144',.8);}
      else {
        const tone=k%3===0?'#c1c17c66':k%2?'#364f3744':'#8eaa6255';
        artLine(c,[[x-2,y],[x-1,y-3],[x,y],[x+2,y-2]],tone,.8);
        if(seed>.73&&k<3) artOval(c,x,y-2,1.2,.8,'#dacd9855');
      }
    }
  }
  c.restore();
}
function cacheTerrain() {
  const layer=document.createElement('canvas');layer.width=2192;layer.height=1336;
  const c=layer.getContext('2d');c.scale(2,2);
  const lvl=LEVELS[G.levelIdx];
  // Soft contact shadow beneath the entire island.
  c.save();c.translate(550,440);c.scale(1,.42);
  const shade=c.createRadialGradient(0,0,100,0,0,490);shade.addColorStop(0,'#071b1488');shade.addColorStop(1,'#071b1400');artOval(c,0,0,490,490,shade);c.restore();
  for(let sum=0;sum<COLS+ROWS-1;sum++) for(let col=0;col<COLS;col++) {
    const row=sum-col;if(row<0||row>=ROWS)continue;
    drawGroundTile(c,col,row,lvl.map[row][col],lvl.theme);
  }
  terrainLayer=layer;terrainLevel=G.levelIdx;
}
function drawWater(c,time) {
  const lvl=LEVELS[G.levelIdx];
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)if(lvl.map[row][col]===T_WATER) {
    const p=gridCenter(col,row);c.save();diamondPath(c,col,row,2);c.clip();
    for(let k=0;k<3;k++) {
      const xx=p.x+Math.sin(time/2400+col+k)*12,yy=p.y-9+k*8;
      artLine(c,[[xx-15,yy],[xx-5,yy-1],[xx+6,yy+1],[xx+13,yy]],lvl.theme==='volcanic'?'#ffb34d60':'#d5e3c750',.8);
    }
    c.restore();
  }
}
function drawBackground(c) {
  const theme=THEMES[G?LEVELS[G.levelIdx].theme:'valley'];
  const g=c.createLinearGradient(0,0,0,viewHeight);g.addColorStop(0,theme.sky[0]);g.addColorStop(1,theme.sky[1]);c.fillStyle=g;c.fillRect(0,0,viewWidth,viewHeight);
  for(let layer=0;layer<3;layer++) {
    const points=[[0,viewHeight]];
    for(let i=0;i<=12;i++) points.push([viewWidth*i/12,viewHeight*(.16+layer*.09)+artSeed(i,layer)*viewHeight*.13]);
    points.push([viewWidth,viewHeight]);artPoly(c,points,['#91a48b10','#102c2415','#0d2b2420'][layer]);
  }
  const glow=c.createRadialGradient(viewWidth*.35,viewHeight*.15,1,viewWidth*.35,viewHeight*.15,viewWidth*.55);
  glow.addColorStop(0,'#d6da9b10');glow.addColorStop(1,'#d6da9b00');c.fillStyle=glow;c.fillRect(0,0,viewWidth,viewHeight);
}
function drawRangeCircle(c,col,row,range) {
  const p=gridCenter(col,row),radius=range*DTW/48;
  c.save();c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.clip();
  const map=LEVELS[G.levelIdx].map;
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)if(map[row][col]===T_PATH){diamondPath(c,col,row,1);c.fillStyle='#f4d68c35';c.fill();}
  c.restore();
  c.save();c.strokeStyle='#e4d49d99';c.lineWidth=1.5;c.setLineDash([5,5]);c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.stroke();c.restore();
}
function drawHoverHighlight(c,col,row,canPlace) {
  diamondPath(c,col,row,1);c.fillStyle=canPlace?'#d4e6a74d':'#df735050';c.fill();c.strokeStyle=canPlace?'#eddfac':'#f7ab8a';c.lineWidth=2;c.stroke();
}
function drawRoute(c) {
  c.save();c.strokeStyle='#f0d99560';c.lineWidth=1.5;c.setLineDash([3,8]);c.beginPath();
  G.screenWPs.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.restore();
}
function drawImpact(c,effect) {
  const progress=1-effect.life/effect.maxLife,r=effect.radius*(.3+progress*.7);
  c.save();c.globalAlpha=1-progress;
  c.strokeStyle=effect.type==='ice'?'#d0e9e3':effect.type==='magic'?'#dbbcf8':'#edc17b';c.lineWidth=2*(1-progress)+.5;
  if(effect.type==='cannon') {c.fillStyle='#d7bf8544';c.beginPath();c.ellipse(effect.x,effect.y,r,r*.65,0,0,Math.PI*2);c.fill();c.stroke();}
  else for(let k=0;k<5;k++){const a=k/5*Math.PI*2;c.beginPath();c.moveTo(effect.x+Math.cos(a)*r*.3,effect.y+Math.sin(a)*r*.3);c.lineTo(effect.x+Math.cos(a)*r,effect.y+Math.sin(a)*r);c.stroke();}
  c.restore();
}
function renderFrame() {
  if(!ctx||!canvas)return;
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
  drawBackground(ctx);
  if(!G)return;
  const lvl=LEVELS[G.levelIdx],time=G.reducedMotion?0:(G.visualTime||0);
  if(terrainLevel!==G.levelIdx||!terrainLayer)cacheTerrain();
  ctx.save();ctx.translate(VIEW_X,VIEW_Y);ctx.scale(VIEW_SCALE,VIEW_SCALE);
  ctx.drawImage(terrainLayer,0,0,1096,668);
  drawWater(ctx,time);
  if(G.phase==='build')drawRoute(ctx);
  if(G.selectedTowerType) {
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)if(lvl.map[row][col]===T_GRASS){diamondPath(ctx,col,row,1);ctx.strokeStyle='#d5dcaa22';ctx.lineWidth=.6;ctx.stroke();}
  }
  const preview=G.selectedTowerType&&G.hoverCell;
  const selected=G.inspectedTower;
  if(selected)drawRangeCircle(ctx,selected.col,selected.row,TOWER_DEFS[selected.type].levels[selected.level].range);
  if(preview) {
    drawRangeCircle(ctx,preview.col,preview.row,TOWER_DEFS[G.selectedTowerType].levels[0].range);
    drawHoverHighlight(ctx,preview.col,preview.row,!placementError(preview.col,preview.row));
  }
  // Ground is complete before any upright object. Everything upright shares a depth sort.
  const objects=[];
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++) {
    const tile=lvl.map[row][col],p=gridCenter(col,row),seed=artSeed(col,row);
    if(tile===T_TREE)objects.push({y:p.y,draw:()=>drawTreeArt(ctx,p.x,p.y,lvl.theme,seed,time)});
    if(tile===T_ROCK)objects.push({y:p.y,draw:()=>drawRockArt(ctx,p.x,p.y,lvl.theme,seed)});
  }
  for(const t of G.towers) {
    const p=gridCenter(t.col,t.row);
    objects.push({y:p.y,draw:()=>{ctx.save();ctx.translate(p.x,p.y);drawTowerArt(ctx,t,time);ctx.restore();}});
  }
  if(preview&&lvl.map[preview.row]?.[preview.col]===T_GRASS&&!G.towers.some(t=>t.col===preview.col&&t.row===preview.row)) {
    const p=gridCenter(preview.col,preview.row);
    objects.push({y:p.y,draw:()=>{ctx.save();ctx.globalAlpha=.55;ctx.translate(p.x,p.y);drawTowerArt(ctx,{type:G.selectedTowerType,level:0,aim:-.5},time);ctx.restore();}});
  }
  const exit=lvl.waypoints[lvl.waypoints.length-1],base=gridCenter(COLS-1,exit[1]),entry=gridCenter(0,lvl.waypoints[0][1]);
  objects.push({y:base.y,draw:()=>drawStronghold(ctx,base.x,base.y,time,!G.reducedMotion&&G.crystalFlash!==undefined&&G.visualTime-G.crystalFlash<450)});
  objects.push({y:entry.y,draw:()=>drawEntryArt(ctx,entry.x,entry.y,time)});
  for(const m of G.remnants)objects.push({y:m.y,draw:()=>{ctx.save();ctx.globalAlpha=m.fade/350;ctx.translate(m.x,m.y);ctx.scale(1,m.fade/350);ctx.translate(-m.x,-m.y);drawMonster(ctx,m);ctx.restore();}});
  for(const m of G.monsters)objects.push({y:m.y,draw:()=>drawMonster(ctx,m)});
  objects.sort((a,b)=>a.y-b.y);objects.forEach(o=>o.draw());
  for(const p of G.projectiles)drawProjectile(ctx,p);
  for(const f of G.effects)drawImpact(ctx,f);
  for(const p of G.particles)drawParticle(ctx,p);
  for(const m of G.monsters)if(!m.dead&&!m.reachedEnd)_drawHPBar(ctx,m.x,m.y,m.hp,m.maxHp,m.scale,m.isBoss);
  ctx.restore();
  updateBossHealth();
}
