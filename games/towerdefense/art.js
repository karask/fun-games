// Procedural artwork shares one light direction, palette and world scale.
function artPoly(c, points, fill, stroke) {
  c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  if(fill) { c.fillStyle=fill; c.fill(); } if(stroke) { c.strokeStyle=stroke; c.stroke(); }
}
function artOval(c,x,y,rx,ry,fill) { c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill(); }
function artLine(c,points,color,width=1) { c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke(); }
function artSeed(a,b=0) { const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n); }
function artShadow(c,x,y,r=24) { const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#06180a65');g.addColorStop(1,'#06180a00');c.save();c.translate(x,y);c.scale(1,.42);artOval(c,0,0,r,r,g);c.restore(); }
function stoneDrum(c,x,y,r,h,tint='stone') {
  const colors=tint==='dark'?['#65716c','#414f4a','#263c35']:['#c2b99b','#968f78','#626b59'];
  const g=c.createLinearGradient(x-r,y,x+r,y);g.addColorStop(0,colors[1]);g.addColorStop(.28,colors[0]);g.addColorStop(1,colors[2]);
  c.beginPath();c.moveTo(x-r,y-h);c.lineTo(x-r,y);c.ellipse(x,y,r,r*.45,0,Math.PI,0,true);c.lineTo(x+r,y-h);c.ellipse(x,y-h,r,r*.45,0,0,Math.PI,true);c.closePath();c.fillStyle=g;c.fill();
  c.save();c.clip();
  for(let j=1;j<h/8;j++) {
    const yy=y-j*8;artLine(c,[[x-r,yy],[x-r*.4,yy+3],[x+r*.4,yy+3],[x+r,yy]],'#37473955',.8);
    for(let k=-2;k<3;k++){const xx=x+k*10+(j%2)*5;artLine(c,[[xx,yy+2],[xx,yy+9]],'#394c3944',.7);}
  }
  c.restore();artOval(c,x,y-h,r,r*.45,colors[0]);
  artOval(c,x,y-h+1,r-3,(r-3)*.42,colors[1]);
  artLine(c,[[x-r,y-h],[x-r,y]],'#dddbc16b',1);
}
function artWindow(c,x,y,glow=false) {
  c.fillStyle='#23352b';c.beginPath();c.moveTo(x-3,y+8);c.lineTo(x-3,y);c.arc(x,y,3,Math.PI,0);c.lineTo(x+3,y+8);c.closePath();c.fill();
  if(glow){c.fillStyle='#eac277';c.fillRect(x-1.5,y,3,6);}
}
function artFlag(c,x,y,color,time=0,small=false) {
  const h=small?19:32,w=small?12:20;
  artLine(c,[[x,y],[x,y-h]],'#a59265',1.5);
  const flutter=Math.sin(time/280+x)*2;
  artPoly(c,[[x+1,y-h+2],[x+w,y-h+4+flutter],[x+w-4,y-h+10],[x+w,y-h+16+flutter],[x+1,y-h+13]],color,'#10261955');
  artLine(c,[[x+4,y-h+4],[x+4,y-h+12]],'#edcd8580',1.5);
  artOval(c,x,y-h-1,2,2,'#d7bd7d');
}
function artTorch(c,x,y,time=0) {
  artLine(c,[[x,y],[x,y-15]],'#423a25',3);
  const g=c.createRadialGradient(x,y-19,1,x,y-19,16);g.addColorStop(0,'#ffbd4744');g.addColorStop(1,'#ffbd4700');
  artOval(c,x,y-19,16,16,g);
  artPoly(c,[[x-4,y-15],[x-5,y-20],[x+Math.sin(time/140+x)*3,y-30],[x+4,y-20],[x+3,y-15]],'#ee964b');
  artPoly(c,[[x-2,y-16],[x,y-25],[x+2,y-17]],'#ffdf91');
}
function drawTreeArt(c,x,y,theme,seed,time) {
  const pine=theme==='forest' || seed>.62;
  const size=.8+seed*.4;
  c.save();c.translate(x,y);c.scale(size,size);artShadow(c,5,6,24);
  artPoly(c,[[-4,3],[-3,-32],[2,-39],[5,2]],'#66523b');
  artLine(c,[[-1,2],[-1,-31]],'#ae8c54',1);
  if(pine) {
    const colors=theme==='forest'?['#214538','#34614b','#507752']:['#2e5b3d','#47774c','#699056'];
    for(let k=0;k<3;k++) {
      const yy=-16-k*16,w=22-k*5;
      artPoly(c,[[-w,yy],[1,yy-32],[w,yy+2],[0,yy+9]],colors[0]);
      artPoly(c,[[-w,yy],[1,yy-32],[0,yy+9]],colors[1]);
      artPoly(c,[[-w,yy],[1,yy-32],[-5,yy-2]],colors[2]);
    }
  } else {
    const sway=Math.sin(time/1800+seed*20)*.7;
    c.translate(sway,0);
    const clusters=[[-15,-37,16],[12,-37,19],[0,-54,22],[-12,-55,13],[15,-57,13]];
    clusters.forEach(([cx,cy,r],i)=>{
      artPoly(c,[[cx-r,cy],[cx-r*.75,cy-r*.65],[cx,cy-r],[cx+r*.8,cy-r*.6],[cx+r,cy],[cx+r*.4,cy+r*.55],[cx-r*.4,cy+r*.55]],['#3c6238','#456e3e','#527d44','#739453','#64884a'][i]);
      artPoly(c,[[cx-r*.75,cy-r*.65],[cx,cy-r],[cx+r*.4,cy-r*.4],[cx-5,cy+3]],'#93a65c55');
      artLine(c,[[cx-r*.5,cy+5],[cx+1,cy+8],[cx+r*.55,cy]],'#2b563644',1);
    });
  }
  artLine(c,[[-8,4],[-6,-2],[-3,4],[8,3],[11,-3]],'#7c985b',1.5);c.restore();
}
function drawRockArt(c,x,y,theme,seed) {
  const warm=theme==='volcanic',s=12+seed*8;
  artShadow(c,x+2,y+2,s+5);
  artPoly(c,[[x-s,y],[x-s*.65,y-s*.7],[x+s*.3,y-s],[x+s,y-s*.3],[x+s*.8,y+s*.2],[x-s*.3,y+s*.3]],warm?'#5b5545':'#7e8972');
  artPoly(c,[[x-s,y],[x-s*.65,y-s*.7],[x+s*.3,y-s],[x,y-s*.1]],warm?'#9a8970':'#b0b39a');
  artPoly(c,[[x,y-s*.1],[x+s*.3,y-s],[x+s,y-s*.3],[x+s*.8,y+s*.2]],warm?'#746b59':'#8d9780');
  if(!warm) artPoly(c,[[x-s,y],[x-s*.4,y-5],[x+1,y-2],[x-4,y+4]],'#586e3e');
}
function drawTowerArt(c,tower,time=0) {
  const {type,level}=tower;const h=34+level*9,shot=(tower.shot||0)/180,aim=tower.aim||0;
  c.save();artShadow(c,4,6,31);stoneDrum(c,0,0,26,6,'dark');
  if(type==='archer') {
    stoneDrum(c,0,-4,19,h);
    artWindow(c,-8,-h*.6,true);artWindow(c,11,-h*.6+4);
    stoneDrum(c,0,-h-4,24,5);
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2,x=Math.cos(a)*21,y=-h-9+Math.sin(a)*8;artPoly(c,[[x-3,y],[x-3,y-8],[x+3,y-8],[x+3,y]],'#bdb69c','#6a745d');}
    c.save();c.translate(0,-h-13);c.scale(aim>Math.PI/2||aim< -Math.PI/2?-1:1,1);
    artOval(c,0,-6,4,5,'#d4b47c');c.fillStyle='#546c3c';c.fillRect(-4,-2,8,10);artPoly(c,[[-5,-10],[1,-14],[7,-9]],'#547648');
    artLine(c,[[3,1],[10,-2]],'#c9af7a',2);c.strokeStyle='#cbb384';c.lineWidth=1.4;c.beginPath();c.arc(8,-2,8,-1.3,1.3);c.stroke();artLine(c,[[10,-10],[7+shot*3,-2],[10,6]],'#e9dfb3',.8);c.restore();
    if(level>0) artFlag(c,-18,-h-7,level===2?'#c8a756':'#638551',time,true);
  } else if(type==='cannon') {
    stoneDrum(c,0,-5,23,15+level*3,'dark');
    artOval(c,0,-24-level*3,18,10,'#988b61');artOval(c,0,-27-level*3,15,8,'#3a4742');
    c.save();c.translate(0,-28-level*3);c.rotate(aim);c.translate(-shot*4,0);
    const barrel=c.createLinearGradient(0,-6,0,7);barrel.addColorStop(0,'#b4ba9e');barrel.addColorStop(.4,'#536461');barrel.addColorStop(1,'#263c38');
    c.fillStyle=barrel;c.fillRect(-6,-6,31+level*4,12);artOval(c,25+level*4,0,3,7,'#91a393');artOval(c,26+level*4,0,2,4,'#1a302b');
    c.strokeStyle='#bdab70';c.lineWidth=2;c.strokeRect(7,-6,3,12);
    if(shot>.5){artPoly(c,[[28,0],[39,-6],[35,0],[44,3],[29,5]],'#ffd38c');}
    c.restore();
    for(let i=0;i<3;i++) artOval(c,-18+i*6,0,3,3,'#253a35');
  } else if(type==='magic') {
    stoneDrum(c,0,-4,18,h,'dark');
    artWindow(c,9,-h*.65,true);
    artPoly(c,[[-23,-h-5],[0,-h-25],[23,-h-5],[0,-h+4]],'#5f6482','#aca8c0');
    artPoly(c,[[0,-h-25],[23,-h-5],[0,-h+4]],'#3e4866');
    const bob=Math.sin(time/600)*2;
    c.save();c.shadowColor='#ba9df5';c.shadowBlur=12;
    artPoly(c,[[0,-h-54+bob],[9,-h-38+bob],[0,-h-25+bob],[-9,-h-38+bob]],'#bba4e7');
    artPoly(c,[[0,-h-54+bob],[9,-h-38+bob],[0,-h-25+bob]],'#77699f');c.restore();
    c.strokeStyle='#cdb888';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-h-37,17+level*3,5,-.3,0,Math.PI*2);c.stroke();
    if(level>0) for(const side of [-1,1]) artTorch(c,side*20,-3,time);
  } else if(type==='ice') {
    stoneDrum(c,0,-4,21,21+level*5);
    artOval(c,0,-27-level*5,22,9,'#829fa0');
    const shards=[[-12,-26,24],[12,-25,29],[0,-27,43+level*7]];
    shards.forEach(([x,y,len],i)=>{y-=level*5;artPoly(c,[[x-6,y],[x-8,y-len*.6],[x,y-len],[x+7,y-len*.5],[x+5,y]],'#a7d4d1');artPoly(c,[[x,y-len],[x+7,y-len*.5],[x+5,y],[x,y-3]],'#548f9a');artLine(c,[[x-5,y-len*.6],[x,y-len],[x+1,y-len*.55]],'#e7f4dd',1.5);});
    for(let i=0;i<4;i++){const a=time/1600+i*Math.PI/2;artOval(c,Math.cos(a)*20,-35+Math.sin(a)*6,1.5,1.5,'#c8e6d8');}
  } else if(type==='dragon') {
    stoneDrum(c,0,-4,23,h,'dark');
    artPoly(c,[[-28,-h-5],[-15,-h-16],[16,-h-16],[28,-h-5],[14,-h+4],[-16,-h+4]],'#715144','#b38b68');
    for(let i=0;i<5;i++) artLine(c,[[-18+i*8,-h-14],[-22+i*9,-h+1]],'#a77a55',2);
    c.save();c.translate(0,-h-23);const wing=Math.sin(time/350)*3+shot*8;
    artPoly(c,[[-3,0],[-27,-15-wing],[-24,2],[-16,-4],[-13,7]],'#813f34','#bd7850');
    artPoly(c,[[3,0],[28,-15-wing],[24,2],[16,-4],[13,7]],'#a5553c','#c9905e');
    artOval(c,0,1,9,12,'#ae6744');artOval(c,4,-12,7,9,'#c37f50');artPoly(c,[[7,-16],[17,-13],[16,-7],[4,-8]],'#ba7650');
    artPoly(c,[[0,-18],[-2,-26],[5,-18],[7,-19],[10,-27],[11,-17]],'#dcc898');
    artOval(c,9,-15,1.8,1.8,'#f5d381');artLine(c,[[0,9],[-8,15],[-14,11]],'#c38b59',3);c.restore();
    artTorch(c,-19,-2,time);artTorch(c,19,-2,time);
  }
  if(level===2) { artOval(c,0,3,7,3,'#bd9b52');artPoly(c,[[0,-1],[3,2],[0,5],[-3,2]],'#f6d997'); }
  c.restore();
}
function drawStronghold(c,x,y,time,flash) {
  c.save();c.translate(x,y);artShadow(c,6,10,58);
  stoneDrum(c,0,8,37,10,'dark');
  stoneDrum(c,-22,-2,12,30);stoneDrum(c,22,-2,12,30);
  for(const xx of [-22,22]) { artPoly(c,[[xx-16,-32],[xx,-55],[xx+16,-32],[xx,-27]],'#60777d','#9aab99');artWindow(c,xx,-19,true); }
  artPoly(c,[[-24,1],[-24,-22],[24,-22],[24,1],[0,11]],'#95947b','#535f4d');
  for(let k=-2;k<=2;k++) artWindow(c,k*8,-14,k%2===0);
  stoneDrum(c,0,-19,17,28);
  const pulse=Math.sin(time/600)*2;
  const glow=c.createRadialGradient(0,-63,1,0,-63,42);glow.addColorStop(0,flash?'#ff9970aa':'#c1a1ff77');glow.addColorStop(1,'#b995ff00');artOval(c,0,-63,42,42,glow);
  artPoly(c,[[0,-94+pulse],[12,-70+pulse],[8,-51+pulse],[-8,-51+pulse],[-12,-70+pulse]],'#bfa8ee');
  artPoly(c,[[0,-94+pulse],[12,-70+pulse],[8,-51+pulse],[0,-64+pulse]],'#806bad');
  artPoly(c,[[0,-94+pulse],[-8,-70+pulse],[0,-64+pulse]],'#e1d7f2');
  artFlag(c,-23,-49,'#c9af71',time,true);artTorch(c,-32,5,time);artTorch(c,32,5,time);c.restore();
}
function drawEntryArt(c,x,y,time) {
  for(const side of [-1,1]) {stoneDrum(c,x+side*23,y+side*7,6,6,'dark');artFlag(c,x+side*23,y+side*7-3,'#a35243',time);}
  artLine(c,[[x-8,y-1],[x,y+3],[x-1,y-4]],'#d8b589',2);
}
