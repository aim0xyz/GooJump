// js/utils.js

// Color conversion utilities (from inline script)
window.hslShift = function(hex, hueShift, satDelta, lightDelta) {
    const {h, s, l} = hexToHsl(hex);
    let nh = (h + hueShift) % 360;
    let ns = Math.max(0, Math.min(1, s + satDelta));
    let nl = Math.max(0, Math.min(1, l + lightDelta));
    return `hsl(${nh}, ${Math.round(ns*100)}%, ${Math.round(nl*100)}%)`;
};

function hexToHsl(hex) {
    const {r,g,b} = hexToRgb(hex);
    const rn = r/255, gn = g/255, bn = b/255;
    const max = Math.max(rn,gn,bn), min = Math.min(rn,gn,bn);
    let h, s, l = (max + min)/2;
    if (max === min) { h = 0; s = 0; }
    else {
        const d = max - min;
        s = l > .5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
            case gn: h = (bn - rn) / d + 2; break;
            case bn: h = (rn - gn) / d + 4; break;
        }
        h *= 60;
    }
    return {h, s, l};
}

function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1],16), g: parseInt(m[2],16), b: parseInt(m[3],16) } : {r:0,g:0,b:0};
}

// Goo splat generation (from inline script, adapted to use window.gameState)
window.spawnGooSplat = function(platform, dir) {
    const px = Math.max(platform.x, Math.min(window.gameState.player.x + window.gameState.player.width / 2, platform.x + platform.width));
    const y = dir < 0 ? platform.y : platform.y + platform.height;
    const baseColor = window.gameState.player.bodyColor;
    const life = 360;
    const width = Math.max(24, Math.min(window.gameState.player.width, platform.width * 0.8));
    // Add goo splat to gameState.gooSplats (world coordinates)
    window.gameState.gooSplats.push({
        x: px,
        y: y, // This is a world coordinate
        dir: dir, // -1 for up, +1 for down
        t: 0, // current time
        life: life, // max life
        color: baseColor,
        w: width, // width
        drops: makeDroplets(px, y, dir, baseColor)
    });
};

function makeDroplets(x, y, dir, color) {
    const count = 3 + Math.floor(Math.random() * 3);
    const arr = [];
    for (let i = 0; i < count; i++) {
        arr.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + dir * (4 + Math.random() * 6),
            dir,
            t: 0,
            life: 420 + Math.random() * 200,
            r0: 2 + Math.random() * 3,
            vx: (Math.random() - 0.5) * 0.3,
            vy: dir * (0.05 + Math.random() * 0.15),
            color
        });
    }
    return arr;
}