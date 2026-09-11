// Existing level speeds use 60 Hz frame units; simulate two half-frames per tick.
export function createClock() {
    let accumulator = 0;
    return {
        reset() { accumulator = 0; },
        advance(seconds, update) {
            accumulator += Math.max(0, Math.min(.1, seconds));
            while (accumulator + 1e-10 >= 1/120) {
                update(.5);
                accumulator -= 1/120;
            }
        }
    };
}
export function pointerPosition(clientX, rect, width) {
    return Math.max(0, Math.min(width, (clientX - rect.left) * width / rect.width));
}
export function paddleBounce(offset, speed) {
    const angle = Math.max(-1, Math.min(1, offset)) * Math.PI * .36;
    return { vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed };
}

// Sweep a circle against rectangle faces and rounded corners. Return first contact.
export function sweepCircleRect(x, y, dx, dy, radius, rect) {
    let result = null;
    const consider = (t, nx, ny) => {
        if (t >= -1e-9 && t <= 1 && dx*nx + dy*ny < -1e-9 && (!result || t < result.t)) {
            result = { t: Math.max(0,t), nx, ny };
        }
    };
    if (dx !== 0) {
        for (const [edge,nx] of [[rect.x-radius,-1],[rect.x+rect.w+radius,1]]) {
            const t=(edge-x)/dx, at=y+dy*t;
            if (at>=rect.y && at<=rect.y+rect.h) consider(t,nx,0);
        }
    }
    if (dy !== 0) {
        for (const [edge,ny] of [[rect.y-radius,-1],[rect.y+rect.h+radius,1]]) {
            const t=(edge-y)/dy, at=x+dx*t;
            if (at>=rect.x && at<=rect.x+rect.w) consider(t,0,ny);
        }
    }
    const a=dx*dx+dy*dy;
    if (a>0) for (const cx of [rect.x,rect.x+rect.w]) for (const cy of [rect.y,rect.y+rect.h]) {
        const ox=x-cx,oy=y-cy,b=2*(ox*dx+oy*dy),c=ox*ox+oy*oy-radius*radius;
        const discriminant=b*b-4*a*c;
        if(discriminant<0)continue;
        const t=(-b-Math.sqrt(discriminant))/(2*a);
        const px=x+dx*t,py=y+dy*t;
        const outsideX=cx===rect.x ? px<=cx : px>=cx;
        const outsideY=cy===rect.y ? py<=cy : py>=cy;
        if(outsideX&&outsideY)consider(t,(px-cx)/radius,(py-cy)/radius);
    }
    return result;
}
