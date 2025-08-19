// js/game-logic.js

// Destructure for easier access
const {
    canvas, ctx, player, platforms, gameCoins, gooSplats, chaosModes,
    currentChaos, gameRunning, worldOffsetY, gameTimeMs, lastChaosTime,
    chaosInterval, coinSize, coinChance, coinValue, inputLeft, inputRight
} = window.gameState;

// --- Game Logic Functions ---
window.applyChaosMode = function(mode) {
    window.gameState.currentChaos = mode;

    // Reset to base
    player.speed = player.baseSpeed;
    player.maxSpeed = player.baseMaxSpeed;
    player.friction = player.baseFriction;
    player.gravity = player.baseGravity;
    player.jumpPower = player.baseJumpPower;

    switch (mode) {
        case "normal":
            window.showChaosAlert("NORMAL MODE");
            setCharacterColor("#9D4EDD");
            break;
        case "gravity_flip":
            window.showChaosAlert("GRAVITY FLIP!");
            player.gravity = -0.42;
            player.jumpPower = 10.5;
            setCharacterColor("#FF69B4");
            break;
        case "reverse_controls":
            window.showChaosAlert("REVERSE CONTROLS!");
            setCharacterColor("#FFA500");
            break;
        case "super_speed":
            window.showChaosAlert("SUPER SPEED!");
            player.speed = 2.1;
            player.maxSpeed = 12;
            setCharacterColor("#00FFFF");
            break;
        case "slippery":
            window.showChaosAlert("SLIPPERY MODE!");
            player.friction = 0.98;
            setCharacterColor("#ADD8E6");
            break;
        case "tiny_platforms":
            window.showChaosAlert("TINY PLATFORMS!");
            setCharacterColor("#FFD700");
            break;
        case "bouncy":
            window.showChaosAlert("BOUNCY MODE!");
            player.jumpPower = -15.5;
            setCharacterColor("#FF69B4");
            break;
        case "slow_motion":
            window.showChaosAlert("SLOW MOTION!");
            player.speed = 0.35;
            player.maxSpeed = 3.2;
            player.gravity = 0.16;
            player.jumpPower = -10.5;
            setCharacterColor("#9370DB");
            break;
    }

    canvas.classList.add('chaos-flash');
    setTimeout(() => canvas.classList.remove('chaos-flash'), 500);
};

function setCharacterColor(color) {
    player.bodyColor = color;
}

window.showChaosAlert = function(text) {
    window.gameState.chaosAlert.textContent = text;
    window.gameState.chaosAlert.style.display = "block";
    setTimeout(() => { window.gameState.chaosAlert.style.display = "none"; }, 2000);
};

window.createPlatforms = function() {
    window.gameState.platforms = [];
    window.gameState.gameCoins = [];
    const spacing = 120;
    // Start platform
    window.gameState.platforms.push({
        x: 150,
        y: canvas.height - 50,
        width: 100,
        height: 16,
        phase: Math.random() * Math.PI * 2
    });

    for (let i = 1; i < 8; i++) {
        const w = window.getPlatformWidth();
        const newPlatform = {
            x: Math.random() * (canvas.width - w),
            y: canvas.height - 50 - (i * spacing),
            width: w,
            height: 16,
            phase: Math.random() * Math.PI * 2
        };
        window.gameState.platforms.push(newPlatform);
        if (Math.random() < coinChance) {
            window.gameState.gameCoins.push({
                x: newPlatform.x + newPlatform.width / 2 - coinSize / 2,
                y: newPlatform.y - coinSize - 5,
                collected: false
            });
        }
    }
};

window.getCameraThreshold = function() {
    return canvas.height * (window.gameState.currentChaos === "gravity_flip" ? 0.6 : 0.4);
};

window.gameLoop = function(ts) {
    if (!window.gameState.gameRunning) {
        window.gameLoop.lastTS = ts;
        return;
    }
    if (!window.gameLoop.lastTS) window.gameLoop.lastTS = ts;
    const dt = Math.min(32, ts - window.gameLoop.lastTS);
    window.gameLoop.lastTS = ts;

    window.gameState.gameTimeMs += dt;

    // Chaos timer
    if (window.gameState.gameTimeMs - window.gameState.lastChaosTime >= chaosInterval) {
        window.gameState.lastChaosTime = window.gameState.gameTimeMs;
        const randomChaos = chaosModes[Math.floor(Math.random() * chaosModes.length)];
        window.applyChaosMode(randomChaos);
    }
    const timeToNextChaos = Math.max(0, chaosInterval - (window.gameState.gameTimeMs - window.gameState.lastChaosTime));
    window.gameState.chaosTimerDisplay.textContent = `Chaos: ${Math.ceil(timeToNextChaos / 1000)}s`;

    update(dt);
    draw();

    requestAnimationFrame(window.gameLoop);
};

function update(dt) {
    // Input with reverse support
    let leftInput = window.gameState.inputLeft;
    let rightInput = window.gameState.inputRight;
    if (window.gameState.currentChaos === "reverse_controls") {
        leftInput = window.gameState.inputRight;
        rightInput = window.gameState.inputLeft;
    }
    if (leftInput) player.dx -= player.speed;
    if (rightInput) player.dx += player.speed;

    player.dx *= player.friction;
    player.dx = Math.max(-player.maxSpeed, Math.min(player.maxSpeed, player.dx));
    player.x += player.dx;

    // Wrap horizontally
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    // Gravity
    player.dy += player.gravity;
    player.y += player.dy;

    // Platform collisions
    let landed = false;
    let landedPlatform = null;

    for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];

        if (window.gameState.currentChaos === "gravity_flip") {
            const collide =
                player.x + player.width > p.x &&
                player.x < p.x + p.width &&
                player.y < p.y + p.height &&
                player.y > p.y - 12 &&
                player.dy < 0;

            if (collide) {
                player.dy = player.jumpPower;
                player.y = p.y + p.height;
                landed = true;
                landedPlatform = p;
                break;
            }
        } else {
            const collide =
                player.x + player.width > p.x &&
                player.x < p.x + p.width &&
                player.y + player.height > p.y &&
                player.y + player.height < p.y + p.height + 12 &&
                player.dy > 0;

            if (collide) {
                player.dy = player.jumpPower;
                player.y = p.y - player.height;
                landed = true;
                landedPlatform = p;
                break;
            }
        }
    }

    if (landed && landedPlatform) {
        window.spawnGooSplat(landedPlatform, window.gameState.currentChaos === "gravity_flip" ? +1 : -1);
        player.squishT = 1.0;
    }

    if (player.squishT > 0) player.squishT = Math.max(0, player.squishT - dt / 200);

    // Camera follow & height
    const cameraThreshold = window.getCameraThreshold();
    const passedThreshold =
        (window.gameState.currentChaos !== "gravity_flip" && player.y < cameraThreshold) ||
        (window.gameState.currentChaos === "gravity_flip" && player.y > cameraThreshold);

    if (passedThreshold) {
        const scrollAmount = Math.abs(cameraThreshold - player.y);
        player.y = cameraThreshold;

        window.gameState.worldOffsetY += scrollAmount;
        window.updateUI();

        if (window.gameState.currentChaos === "gravity_flip") {
            platforms.forEach(p => p.y -= scrollAmount);
            gameCoins.forEach(c => c.y -= scrollAmount);
            window.gameState.platforms = platforms.filter(p => p.y > -60);
            window.gameState.gameCoins = gameCoins.filter(c => c.y > -60);
            while (window.gameState.platforms.length < 8) {
                const bottom = window.gameState.platforms.reduce((low, p) => (p.y > low.y ? p : low));
                const w = window.getPlatformWidth();
                const newPlatform = {
                    x: Math.random() * (canvas.width - w),
                    y: bottom.y + 120,
                    width: w,
                    height: 16,
                    phase: Math.random() * Math.PI * 2
                };
                window.gameState.platforms.push(newPlatform);
                if (Math.random() < coinChance) {
                    window.gameState.gameCoins.push({
                        x: newPlatform.x + newPlatform.width / 2 - coinSize / 2,
                        y: newPlatform.y + newPlatform.height + 5,
                        collected: false
                    });
                }
            }
        } else {
            platforms.forEach(p => p.y += scrollAmount);
            gameCoins.forEach(c => c.y += scrollAmount);
            window.gameState.platforms = platforms.filter(p => p.y < canvas.height + 60);
            window.gameState.gameCoins = gameCoins.filter(c => c.y < canvas.height + 60);
            while (window.gameState.platforms.length < 8) {
                const top = window.gameState.platforms.reduce((hi, p) => (p.y < hi.y ? p : hi));
                const w = window.getPlatformWidth();
                const newPlatform = {
                    x: Math.random() * (canvas.width - w),
                    y: top.y - 120,
                    width: w,
                    height: 16,
                    phase: Math.random() * Math.PI * 2
                };
                window.gameState.platforms.push(newPlatform);
                if (Math.random() < coinChance) {
                    window.gameState.gameCoins.push({
                        x: newPlatform.x + newPlatform.width / 2 - coinSize / 2,
                        y: newPlatform.y - coinSize - 5,
                        collected: false
                    });
                }
            }
        }
    }

    // Update goo splats
    for (let i = gooSplats.length - 1; i >= 0; i--) {
        const g = gooSplats[i];
        g.t += dt;
        if (g.t >= g.life) {
            gooSplats.splice(i, 1);
        }
    }

    // Coin collection (current round only)
    for (let i = gameCoins.length - 1; i >= 0; i--) {
        const coin = gameCoins[i];
        if (!coin.collected) {
            if (
                player.x < coin.x + coinSize &&
                player.x + player.width > coin.x &&
                player.y < coin.y + coinSize &&
                player.y + player.height > coin.y
            ) {
                coin.collected = true;
                window.gameState.currentRoundCoins += coinValue;
                window.updateUI();
                gameCoins.splice(i, 1);
            }
        }
    }

    // Death condition
    if ((window.gameState.currentChaos !== "gravity_flip" && player.y > canvas.height + 60) ||
        (window.gameState.currentChaos === "gravity_flip" && player.y < -60)) {
        window.endGame();
    }
}

// --- Drawing Functions ---
window.draw = function() {
    const t = window.gameState.gameTimeMs;
    const h = window.heightMeters();
    const chaosIntensity = h / 1000;

    drawEvolvingBackground(t, chaosIntensity);

    platforms.forEach(p => drawPlatform(p, t, chaosIntensity));
    gameCoins.forEach(c => drawCoin(c));
    drawGooSplats(t);
    drawCharacter(player.x, player.y, player.width, player.height, t);
};

function drawEvolvingBackground(t, intensity) {
    const ease = (x) => x < 0 ? 0 : x / (1 + x);
    const k = ease(intensity);

    const topHueShift = Math.min(60, k * 60);
    const bottomHueShift = Math.min(120, k * 120);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, window.hslShift("#2c5364", topHueShift, 0.0, 0.0));
    grad.addColorStop(0.5, window.hslShift("#203a43", topHueShift * 0.6, 0.05, 0.0));
    grad.addColorStop(1, window.hslShift("#0f2027", bottomHueShift, -0.05, -0.05));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blobCount = Math.floor(5 + Math.min(20, k * 12));
    const speed = 0.02 + Math.min(0.12, k * 0.08);
    const blur = Math.min(10, k * 10);
    const alpha = 0.08 + Math.min(0.2, k * 0.15);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (ctx.filter !== undefined) ctx.filter = `blur(${blur.toFixed(1)}px)`;

    for (let i = 0; i < blobCount; i++) {
        const phase = i * 917;
        const x = (t * speed + phase) % (canvas.width + 120) - 60;
        const y = (t * speed * 0.6 + phase * 0.3) % (canvas.height + 120) - 60;
        const rx = 30 + 25 * Math.sin((t * 0.002) + i);
        const ry = 20 + 18 * Math.cos((t * 0.0025) - i);

        ctx.fillStyle = i % 2 === 0 ? player.bodyColor : "#457B9D";
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (ctx.filter !== undefined) ctx.filter = "none";
    ctx.restore();
}

function drawPlatform(p, t, chaosIntensity) {
    const wobbleAmp = 2 + Math.min(5, chaosIntensity * 2.5);
    const frequency = 0.003 + chaosIntensity * 0.0015;
    const phase = p.phase + t * frequency;

    const x = p.x;
    const y = p.y;
    const w = p.width;
    const h = p.height;

    const topY = y + (Math.sin(phase) * wobbleAmp);
    const botY = y + h + (Math.sin(phase + 1.9) * wobbleAmp * 0.6);

    const fill = ctx.createLinearGradient(0, y, 0, y + h);
    fill.addColorStop(0, window.hslShift("#6EA8D6", chaosIntensity * 30, -0.05, 0.05));
    fill.addColorStop(1, window.hslShift("#457B9D", chaosIntensity * 10, 0.0, -0.02));
    ctx.fillStyle = fill;

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = Math.sin(t * 0.005 + p.phase) * 6;

    ctx.beginPath();
    ctx.moveTo(x + 10, topY);
    ctx.quadraticCurveTo(x, topY, x, topY + h/2);
    ctx.quadraticCurveTo(x, botY, x + 10, botY);
    ctx.lineTo(x + w - 10, botY);
    ctx.quadraticCurveTo(x + w, botY, x + w, topY + h/2);
    ctx.quadraticCurveTo(x + w, topY, x + w - 10, topY);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, topY + 4);
    ctx.lineTo(x + w - 8, topY + 4 + Math.sin(phase + 0.6) * 1.5);
    ctx.stroke();
}

function drawGooSplats(t) {
    for (const g of window.gameState.gooSplats) {
        const prog = g.t / g.life;
        const easeOut = 1 - Math.pow(1 - prog, 2);
        const alpha = 0.6 * (1 - easeOut);
        const radius = 6 + easeOut * 18;
        const width = g.w * (0.6 + 0.4 * (1 - easeOut));

        ctx.save();
        ctx.globalAlpha = alpha;
        if (ctx.filter !== undefined) ctx.filter = "blur(4px)";
        ctx.fillStyle = g.color;

        ctx.beginPath();
        const y = g.y + g.dir * (2 + easeOut * 4);
        const x1 = g.x - width / 2;
        const x2 = g.x + width / 2;
        ctx.moveTo(x1, y);
        ctx.quadraticCurveTo(x1 - radius, y + g.dir * radius, x1, y + g.dir * radius * 2);
        ctx.lineTo(x2, y + g.dir * radius * 2);
        ctx.quadraticCurveTo(x2 + radius, y + g.dir * radius, x2, y);
        ctx.closePath();
        ctx.fill();

        const bumps = 3;
        for (let i = 0; i < bumps; i++) {
            const bx = x1 + (i + 0.5) * (width / bumps);
            const br = 3 + easeOut * 6;
            ctx.beginPath();
            ctx.ellipse(bx, y + g.dir * (2 + i), br, br * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (g.drops) {
            for (const d of g.drops) {
                d.t += 16;
                const dp = Math.min(1, d.t / d.life);
                const dr = d.r0 + dp * 3;
                const dalpha = 0.5 * (1 - dp);
                d.x += d.vx * 16;
                d.y += d.vy * 16;

                ctx.globalAlpha = dalpha;
                ctx.fillStyle = d.color;
                ctx.beginPath();
                ctx.ellipse(d.x, d.y, dr, dr * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (ctx.filter !== undefined) ctx.filter = "none";
        ctx.restore();
    }
}

function drawCoin(coin) {
    if (coin.collected) return;
    ctx.beginPath();
    ctx.arc(coin.x + window.gameState.coinSize / 2, coin.y + window.gameState.coinSize / 2, window.gameState.coinSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "gold";
    ctx.fill();
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (Math.random() < 0.1) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(coin.x + window.gameState.coinSize / 2 + (Math.random()-0.5)*4, coin.y + window.gameState.coinSize / 2 + (Math.random()-0.5)*4, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawCharacter(x, y, w, h, t) {
    const squish = player.squishT;
    const squashY = 1 + 0.25 * squish;
    const squashX = 1 - 0.12 * squish;

    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = player.bodyColor;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    ctx.beginPath();
    const wob = 2 + Math.sin(t * 0.005) * 1.5;
    const r = Math.min(w, h) / 2 - 3;
    const bx = cx, by = cy;
    for (let i = 0; i <= 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const nr = r + Math.sin(ang * 3 + t * 0.003) * 2 + wob;
        const px = bx + Math.cos(ang) * nr;
        const py = by + Math.sin(ang) * nr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = "#FFD166";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    const eyeLX = x + w * 0.38, eyeLY = y + h * 0.42;
    ctx.beginPath(); ctx.arc(eyeLX, eyeLY, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(eyeLX, eyeLY, 2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#457B9D";
    ctx.strokeStyle = "#000";
    const eyeRX = x + w * 0.62, eyeRY = y + h * 0.5;
    ctx.beginPath(); ctx.arc(eyeRX, eyeRY, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(eyeRX, eyeRY, 1.8, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}