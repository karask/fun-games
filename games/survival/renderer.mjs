const TAU = Math.PI * 2;
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function text(ctx, value, x, y, color, size = 12) {
    ctx.fillStyle = color; ctx.font = `600 ${size}px system-ui, sans-serif`; ctx.fillText(value, x, y);
}

export function drawArena(ctx, scene) {
    const { player, enemies, bullets, particles, powerups, labels, time, reducedMotion } = scene;
    ctx.save();
    const background = ctx.createRadialGradient(400, 280, 60, 400, 300, 530);
    background.addColorStop(0, '#112b36'); background.addColorStop(1, '#070e19');
    ctx.fillStyle = background; ctx.fillRect(0, 0, 800, 600);
    ctx.strokeStyle = '#70d8d20c'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= 800; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, 600); }
    for (let y = 0; y <= 600; y += 40) { ctx.moveTo(0, y); ctx.lineTo(800, y); }
    ctx.stroke();
    ctx.strokeStyle = '#64bec315';
    for (const radius of [100, 200, 300]) { circle(ctx, 400, 300, radius); ctx.stroke(); }
    ctx.strokeStyle = '#49858b'; ctx.lineWidth = 2;
    for (const [x,y,sx,sy] of [[10,10,1,1],[790,10,-1,1],[10,590,1,-1],[790,590,-1,-1]]) {
        ctx.beginPath();ctx.moveTo(x+24*sx,y);ctx.lineTo(x,y);ctx.lineTo(x,y+24*sy);ctx.stroke();
    }
    ctx.globalAlpha = .18; ctx.textAlign = 'center';
    text(ctx, 'N / S   ·   CONTAINMENT GRID', 400, 575, '#98ccd5', 10);
    ctx.globalAlpha = 1;

    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life/p.maxLife) * (reducedMotion ? .4 : 1);
        ctx.fillStyle = p.color;
        circle(ctx, p.x, p.y, p.size || 1.5 + p.life * 3); ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const p of powerups) {
        ctx.save(); ctx.translate(p.x,p.y);
        const pulse = reducedMotion ? 1 : 1 + Math.sin(time*5)*.06;
        ctx.scale(pulse,pulse);
        if (p.life < 2) ctx.globalAlpha = .55 + .45 * (reducedMotion ? 1 : Math.sin(time*10)**2);
        ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
        ctx.shadowColor = p.color; ctx.shadowBlur = reducedMotion ? 0 : 12;
        ctx.fillStyle = '#142933';
        ctx.beginPath(); ctx.moveTo(0,-15);ctx.lineTo(15,0);ctx.lineTo(0,15);ctx.lineTo(-15,0);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.textAlign = 'center';text(ctx,p.type === 'health' ? '+' : p.type === 'rapidFire' ? 'ϟ' : 'Ⅲ',0,5,p.color,16);
        ctx.restore();
    }
    for (const b of bullets) {
        ctx.strokeStyle = '#71e9e8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.shadowColor = '#67ffff'; ctx.shadowBlur = reducedMotion ? 0 : 8;
        ctx.beginPath();ctx.moveTo(b.x-b.dx*14,b.y-b.dy*14);ctx.lineTo(b.x,b.y);ctx.stroke();
        ctx.fillStyle = '#efffff';circle(ctx,b.x,b.y,2.5);ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (const e of enemies) {
        if (e.spawnTime > 0) {
            const x = Math.max(20,Math.min(780,e.x)), y = Math.max(20,Math.min(580,e.y));
            ctx.strokeStyle = e.color;ctx.lineWidth = 1;
            circle(ctx,x,y,12+e.spawnTime*16);ctx.stroke();
            ctx.textAlign='center';text(ctx,'!',x,y+4,e.color,13);
            continue;
        }
        ctx.save(); ctx.translate(e.x,e.y);
        ctx.rotate(e.rotation);
        ctx.fillStyle = e.hitFlash > 0 ? '#ffe4ee' : e.isFast ? '#392b20' : '#311c2c';
        ctx.strokeStyle = e.hitFlash > 0 ? '#fff' : e.color; ctx.lineWidth = 2;
        ctx.shadowColor = e.color; ctx.shadowBlur = reducedMotion ? 0 : 9;
        ctx.beginPath();
        const sides = e.isFast ? 3 : 6;
        for(let i=0;i<sides;i++) {
            const angle=i/sides*TAU, r=e.size;
            if(i===0)ctx.moveTo(Math.cos(angle)*r,Math.sin(angle)*r);
            else ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);
        }
        ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
        ctx.scale(.4,.4); ctx.stroke();
        ctx.restore();
        if (e.health < e.maxHealth) {
            ctx.fillStyle='#29313f';ctx.fillRect(e.x-16,e.y-e.size-9,32,3);
            ctx.fillStyle=e.color;ctx.fillRect(e.x-16,e.y-e.size-9,32*e.health/e.maxHealth,3);
        }
    }

    let angle = Math.atan2(player.aimY,player.aimX);
    let closestDistance = Infinity;
    for(const e of enemies) {
        const distance=Math.hypot(e.x-player.x,e.y-player.y);
        if(distance<closestDistance){closestDistance=distance;angle=Math.atan2(e.y-player.y,e.x-player.x)}
    }
    ctx.save();ctx.translate(player.x,player.y);
    if(player.invulnerable>0) {
        ctx.strokeStyle=player.dashTime>0?'#fff':'#b6fff5';ctx.lineWidth=2;
        ctx.globalAlpha = reducedMotion ? .8 : .5+Math.sin(time*18)**2*.5;
        circle(ctx,0,0,28);ctx.stroke();ctx.globalAlpha=1;
    }
    ctx.rotate(angle);
    const glow=ctx.createRadialGradient(-5,-7,1,0,0,22);
    glow.addColorStop(0,'#dbfff7');glow.addColorStop(.35,'#68f7e6');glow.addColorStop(1,'#08768e');
    ctx.shadowColor='#46f1df';ctx.shadowBlur=reducedMotion?0:16;
    ctx.fillStyle=glow;circle(ctx,0,0,player.size);ctx.fill();
    ctx.strokeStyle='#78ffef';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,21,.25,TAU-.25);ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='#071925';circle(ctx,0,0,7);ctx.fill();
    ctx.strokeStyle='#d8fffb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(-1,-1,6,3.5,4.8);ctx.stroke();
    ctx.fillStyle='#d9fff9';ctx.fillRect(17,-3,10,6);
    ctx.restore();
    for(const [timer,color,radius] of [[player.powerups.rapidFireTimer,'#ffe090',32],[player.powerups.multiShotTimer,'#bcabff',36]]) {
        if(timer<=0)continue;
        ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(player.x,player.y,radius,-Math.PI/2,-Math.PI/2+TAU*timer/10);ctx.stroke();
    }
    ctx.textAlign='center';
    for(const label of labels){ctx.globalAlpha=Math.min(1,label.life*2);text(ctx,label.text,label.x,label.y,label.color,12)}
    ctx.globalAlpha=1;
    if(scene.announcementTime>0) {
        ctx.globalAlpha=Math.min(1,scene.announcementTime);
        text(ctx,scene.announcement,400,108,'#b8f7ef',18);ctx.globalAlpha=1;
    }
    if(scene.damageFlash>0&&!reducedMotion) {
        ctx.strokeStyle=`rgba(255,85,120,${scene.damageFlash*2})`;ctx.lineWidth=12;ctx.strokeRect(6,6,788,588);
    }
    ctx.restore();
}
