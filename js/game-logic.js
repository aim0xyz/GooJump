// js/game-logic.js

// The window.gameState object is already initialized in game-state.js.
// We will assign its DOM element properties here within DOMContentLoaded.

document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    window.gameState.canvas = document.getElementById('gameCanvas');
    window.gameState.ctx = window.gameState.canvas.getContext('2d');
    // Ensure canvas dimensions match HTML (assuming 400x600 from index.html)
    window.gameState.canvas.width = 400;
    window.gameState.canvas.height = 600;
    console.log("Canvas context initialized. Canvas dimensions:", window.gameState.canvas.width, "x", window.gameState.canvas.height);

    // Assign UI element references after DOM is ready
    // CORRECTED IDs to match index.html for score, chaosTimer, leftZone, rightZone:
    window.gameState.scoreDisplay = document.getElementById("score");
    window.gameState.coinsDisplay = document.getElementById("coinsDisplay");
    window.gameState.heartsDisplay = document.getElementById("heartsDisplay");
    window.gameState.chaosTimerDisplay = document.getElementById("chaosTimer"); // Corrected ID
    window.gameState.chaosAlert = document.getElementById("chaosAlert");
    window.gameState.leftZone = document.getElementById("leftZone"); // Corrected ID
    window.gameState.rightZone = document.getElementById("rightZone"); // Corrected ID

    console.log("UI elements assigned to gameState.");
});

// --- Core Game Loop ---
window.gameLoop = function(timestamp) {
    if (!window.gameState.gameRunning) return;

    // dt calculation for game logic
    const dt = timestamp - (window.gameLoop.lastTS || timestamp);
    window.gameLoop.lastTS = timestamp;
    window.gameState.gameTimeMs += dt;

    window.updateGame(dt); // Pass dt directly, updateGame will handle conversion if needed
    window.drawGame();

    requestAnimationFrame(window.gameLoop);
};

// --- Game Logic Updates ---
window.updateGame = function(dt) {
    // Player horizontal movement (adapted from inline script using speed & friction)
    let leftInput = window.gameState.inputLeft;
    let rightInput = window.gameState.inputRight;

    // Apply reverse controls chaos mode
    if (window.gameState.chaosMode === "reverse_controls") {
        leftInput = window.gameState.inputRight;
        rightInput = window.gameState.inputLeft;
    }

    if (leftInput) window.gameState.player.dx -= window.gameState.player.speed;
    if (rightInput) window.gameState.player.dx += window.gameState.player.speed;

    window.gameState.player.dx *= window.gameState.player.friction;
    window.gameState.player.dx = Math.max(-window.gameState.player.maxSpeed, Math.min(window.gameState.player.maxSpeed, window.gameState.player.dx));
    window.gameState.player.x += window.gameState.player.dx;

    // Wrap horizontally
    if (window.gameState.player.x + window.gameState.player.width < 0) window.gameState.player.x = window.gameState.canvas.width;
    if (window.gameState.player.x > window.gameState.canvas.width) window.gameState.player.x = -window.gameState.player.width;

    // Apply gravity
    window.gameState.player.dy += window.gameState.player.gravity;
    window.gameState.player.y += window.gameState.player.dy; // Player Y is a world coordinate

    // Camera movement and platform culling/generation
    // `cameraThreshold` is a point on the SCREEN where the player should not go above/below.
    const cameraThreshold = window.getCameraThreshold(); // This considers gravity flip

    // Convert player's world Y to their current SCREEN Y: `screenPlayerY = player.y - worldOffsetY`.
    const screenPlayerY = window.gameState.player.y - window.gameState.worldOffsetY;

    let passedThreshold = false;
    let scrollAmount = 0;

    if (window.gameState.chaosMode === "gravity_flip") {
        // In gravity flip, player moves upwards (smaller Y in world coords) to trigger scroll
        if (screenPlayerY > cameraThreshold) { // Player has gone too far "down" on screen
            scrollAmount = screenPlayerY - cameraThreshold;
            passedThreshold = true;
        }
    } else {
        // Normal gravity, player moves downwards (larger Y in world coords) to trigger scroll
        if (screenPlayerY < cameraThreshold) { // Player has gone too far "up" on screen
            scrollAmount = cameraThreshold - screenPlayerY;
            passedThreshold = true;
        }
    }

    if (passedThreshold) {
        window.gameState.worldOffsetY += scrollAmount * (window.gameState.chaosMode === "gravity_flip" ? 1 : -1); // Adjust worldOffsetY accordingly
        // Player's world Y position does NOT change here, only the camera offset.
        window.updateUI(); // Update UI for height display

        // Generate/Cull platforms & coins (adapted from inline script, but integrated into our system)
        window.generateNewPlatformsAndCoins();
    }

    // Platform collisions
    let landed = false;
    let landedPlatform = null;

    for (let i = 0; i < window.gameState.platforms.length; i++) {
        const p = window.gameState.platforms[i];

        if (window.gameState.chaosMode === "gravity_flip") {
            // Collision logic for inverted gravity (player hits bottom of platforms)
            const collide =
                window.gameState.player.x + window.gameState.player.width > p.x &&
                window.gameState.player.x < p.x + p.width &&
                window.gameState.player.y < p.y + p.height && // Player top intersects platform bottom
                window.gameState.player.y > p.y + p.height - 12 && // Player was below platform in previous frame
                window.gameState.player.dy < 0; // Player is moving upwards (into platform)

            if (collide) {
                if (p.type === 'spike') {
                    console.log("Hit spike platform (gravity flip). Game Over.");
                    window.endGame();
                    return;
                }
                window.gameState.player.dy = window.gameState.player.jumpPower * (p.type === 'bouncy' ? 1.5 : 1); // Jump "down"
                window.gameState.player.y = p.y + p.height; // Snap player to bottom of platform (world coord)
                landed = true;
                landedPlatform = p;
                break;
            }
        } else {
            // Normal collision logic (player hits top of platforms)
            const collide =
                window.gameState.player.x + window.gameState.player.width > p.x &&
                window.gameState.player.x < p.x + p.width &&
                window.gameState.player.y + window.gameState.player.height > p.y && // Player bottom intersects platform top
                window.gameState.player.y + window.gameState.player.height < p.y + window.gameState.player.dy + p.height; // Player was above platform in previous frame

            if (collide) {
                if (p.type === 'spike') {
                    console.log("Hit spike platform. Game Over.");
                    window.endGame();
                    return;
                }
                window.gameState.player.dy = window.gameState.player.jumpPower * (p.type === 'bouncy' ? 1.5 : 1); // Jump off platform
                window.gameState.player.y = p.y - window.gameState.player.height; // Snap player to top of platform (world coord)
                landed = true;
                landedPlatform = p;
                break;
            }
        }
    }

    if (landed && landedPlatform) {
        // Player squish animation
        window.gameState.player.squishT = 1.0;
        // Spawn goo splat using helper
        window.spawnGooSplat(landedPlatform, window.gameState.chaosMode === "gravity_flip" ? +1 : -1);
    }
    // Update player squish
    if (window.gameState.player.squishT > 0) window.gameState.player.squishT = Math.max(0, window.gameState.player.squishT - dt / 200);


    // Coin collection
    // Coin Y is world coord. Player Y is world coord. Direct comparison is fine.
    for (let i = window.gameState.gameCoins.length - 1; i >= 0; i--) {
        const coin = window.gameState.gameCoins[i];
        if (!coin.collected) {
            if (
                window.gameState.player.x < coin.x + window.gameState.coinRadius &&
                window.gameState.player.x + window.gameState.player.width > coin.x - window.gameState.coinRadius &&
                window.gameState.player.y < coin.y + window.gameState.coinRadius &&
                window.gameState.player.y + window.gameState.player.height > coin.y - window.gameState.coinRadius
            ) {
                coin.collected = true;
                window.gameState.currentRoundCoins += window.gameState.coinValue;
                window.updateUI(); // Update UI immediately
                window.gameState.gameCoins.splice(i, 1); // Remove collected coin
            }
        }
    }

    // Update goo splats
    for (let i = window.gameState.gooSplats.length - 1; i >= 0; i--) {
        const g = window.gameState.gooSplats[i];
        g.t += dt; // Increment splat's internal time
        if (g.t >= g.life) {
            window.gameState.gooSplats.splice(i, 1);
        }
        // Update droplets if any
        if (g.drops) {
            for (const d of g.drops) {
                d.t += dt; // dt for droplets too
                d.x += d.vx * (dt / 16); // Normalize velocity by dt
                d.y += d.vy * (dt / 16);
            }
        }
    }


    // Death condition (player falls off screen)
    const screenPlayerBottom = window.gameState.player.y - window.gameState.worldOffsetY + window.gameState.player.height;
    const screenPlayerTop = window.gameState.player.y - window.gameState.worldOffsetY;
    if ((window.gameState.chaosMode !== "gravity_flip" && screenPlayerTop > window.gameState.canvas.height + 60) ||
        (window.gameState.chaosMode === "gravity_flip" && screenPlayerBottom < -60)) {
        console.log("Player fell off screen. Game Over.");
        window.endGame();
    }

    // Chaos Mode Management (dt from gameLoop)
    if (window.gameState.gameTimeMs - window.gameState.lastChaosTime >= window.gameState.chaosInterval) {
        window.gameState.lastChaosTime = window.gameState.gameTimeMs;
        const modes = window.gameState.chaosModes.filter(m => m !== "normal"); // Exclude "normal" from random selection
        const newMode = modes[Math.floor(Math.random() * modes.length)];
        window.applyChaosMode(newMode);

        // Schedule return to normal mode after chaos duration
        setTimeout(() => {
            window.applyChaosMode('normal');
        }, window.gameState.chaosDuration);
    }
};

// --- Drawing Functions ---
window.drawGame = function() {
    const t = window.gameState.gameTimeMs;
    const h = window.heightMeters();
    const chaosIntensity = h / 1000; // Passed to background/platform drawing for visual variation

    // Draw background (evolved from inline script)
    drawEvolvingBackground(t, chaosIntensity);

    // Draw Platforms
    // Loop through platforms, calculate screenY, then pass to drawPlatform
    for (let i = 0; i < window.gameState.platforms.length; i++) {
        const p = window.gameState.platforms[i];
        const screenY = p.y - window.gameState.worldOffsetY; // Convert world Y to screen Y
        if (screenY + p.height > 0 && screenY < window.gameState.canvas.height) { // Only draw if visible
            drawPlatform(p, t, chaosIntensity, screenY); // Pass screenY for drawing
        }
    }

    // Draw Coins
    // Loop through coins, calculate screenY, then pass to drawCoin
    window.gameState.gameCoins.forEach(c => {
        const screenY = c.y - window.gameState.worldOffsetY; // Convert world Y to screen Y
        if (!c.collected && screenY + window.gameState.coinRadius > 0 && screenY - window.gameState.coinRadius < window.gameState.canvas.height) {
            drawCoin(c, screenY); // Pass screenY for drawing
        }
    });

    // Draw Goo Splats
    drawGooSplats(t); // Goo splats handle their own screen Y conversion within their function

    // Draw Player
    const player = window.gameState.player;
    // Player's world Y position, converted to screen Y for drawing
    const screenPlayerY = player.y - window.gameState.worldOffsetY;
    drawCharacter(player.x, screenPlayerY, player.width, player.height, t); // Pass screenPlayerY
};


// --- Drawing Helpers (adapted from inline script) ---

function drawEvolvingBackground(t, intensity) {
    const ctx = window.gameState.ctx;
    const canvas = window.gameState.canvas;

    const ease = (x) => x < 0 ? 0 : x / (1 + x);
    const k = ease(intensity); // K is intensity factor [0,1]

    // Background gradient
    const topHueShift = Math.min(60, k * 60);
    const bottomHueShift = Math.min(120, k * 120);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, window.hslShift("#2c5364", topHueShift, 0.0, 0.0));
    grad.addColorStop(0.5, window.hslShift("#203a43", topHueShift * 0.6, 0.05, 0.0));
    grad.addColorStop(1, window.hslShift("#0f2027", bottomHueShift, -0.05, -0.05));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated blobs (visual noise/effect)
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

        // Blobs use player colors (body color and right eye color)
        ctx.fillStyle = i % 2 === 0 ? window.gameState.player.bodyColor : window.gameState.player.eyeRight.color;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    if (ctx.filter !== undefined) ctx.filter = "none";
    ctx.restore();
}

function drawPlatform(p, t, chaosIntensity, screenY) {
    const ctx = window.gameState.ctx;
    const wobbleAmp = 2 + Math.min(5, chaosIntensity * 2.5);
    const frequency = 0.003 + chaosIntensity * 0.0015;
    const phase = p.phase + t * frequency;

    const x = p.x; // World X
    const y = screenY; // Screen Y
    const w = p.width;
    const h = p.height;

    const topY = y + (Math.sin(phase) * wobbleAmp);
    const botY = y + h + (Math.sin(phase + 1.9) * wobbleAmp * 0.6);

    const fill = ctx.createLinearGradient(0, y, 0, y + h);
    // Platform colors influenced by chaos intensity
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

    ctx.setLineDash([]); // Reset line dash for other drawings
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, topY + 4);
    ctx.lineTo(x + w - 8, topY + 4 + Math.sin(phase + 0.6) * 1.5);
    ctx.stroke();

    // Draw specific features for spike/bouncy platforms (adapted from previous code)
    if (p.type === 'spike') {
        ctx.fillStyle = '#ff0000'; // Red color for spikes
        const spikeHeight = p.height * 0.8; // Spikes are almost as tall as the platform
        const spikeWidth = p.width / 5; // Example: 5 spikes across the platform
        for (let j = 0; j < Math.ceil(p.width / (spikeWidth / 2)); j++) { // Ensure full coverage
            const spikeX = p.x + j * (spikeWidth / 2);
            const spikeY = screenY; // Use screenY
            ctx.beginPath();
            ctx.moveTo(spikeX, spikeY + p.height); // Bottom left of spike base
            ctx.lineTo(spikeX + spikeWidth / 2, spikeY + p.height - spikeHeight); // Top point of spike
            ctx.lineTo(spikeX + spikeWidth, spikeY + p.height); // Bottom right of spike base
            ctx.closePath();
            ctx.fill();
        }
    } else if (p.type === 'bouncy') {
        ctx.fillStyle = '#ADD8E6'; // Light blue for bouncy
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, screenY + p.height / 2, p.width / 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGooSplats(t) {
    const ctx = window.gameState.ctx;
    for (const g of window.gameState.gooSplats) {
        const prog = g.t / g.life;
        const easeOut = 1 - Math.pow(1 - prog, 2);
        const alpha = 0.6 * (1 - easeOut);
        // const radius = 6 + easeOut * 18; // Original code, seems not used for main splat shape
        const width = g.w * (0.6 + 0.4 * (1 - easeOut));

        ctx.save();
        ctx.globalAlpha = alpha;
        if (ctx.filter !== undefined) ctx.filter = "blur(4px)";
        ctx.fillStyle = g.color;

        ctx.beginPath();
        // Convert world Y to screen Y for drawing
        const y = g.y - window.gameState.worldOffsetY + g.dir * (2 + easeOut * 4);
        const x1 = g.x - width / 2;
        const x2 = g.x + width / 2;
        ctx.moveTo(x1, y);
        ctx.quadraticCurveTo(x1 - (width / 4), y + g.dir * (width / 4), x1, y + g.dir * (width / 2)); // Adjusted for smoother shape
        ctx.lineTo(x2, y + g.dir * (width / 2));
        ctx.quadraticCurveTo(x2 + (width / 4), y + g.dir * (width / 4), x2, y);
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
                const dp = Math.min(1, d.t / d.life);
                const dr = d.r0 + dp * 3;
                const dalpha = 0.5 * (1 - dp);
                // Convert world Y to screen Y for drawing
                const dropScreenY = d.y - window.gameState.worldOffsetY;

                ctx.globalAlpha = dalpha;
                ctx.fillStyle = d.color;
                ctx.beginPath();
                ctx.ellipse(d.x, dropScreenY, dr, dr * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (ctx.filter !== undefined) ctx.filter = "none";
        ctx.restore();
    }
}

function drawCoin(coin, screenY) {
    const ctx = window.gameState.ctx;
    if (coin.collected) return;

    const coinSize = window.gameState.coinRadius * 2; // Consistent with CoinRadius meaning half size

    ctx.beginPath();
    ctx.arc(coin.x + coinSize / 2, screenY + coinSize / 2, coinSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = "gold";
    ctx.fill();
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Small shimmer effect
    if (Math.random() < 0.1) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(coin.x + coinSize / 2 + (Math.random()-0.5)*4, screenY + coinSize / 2 + (Math.random()-0.5)*4, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawCharacter(x, y, w, h, t) {
    const ctx = window.gameState.ctx;
    const player = window.gameState.player;

    const squish = player.squishT;
    const squashY = 1 + 0.25 * squish;
    const squashX = 1 - 0.12 * squish;

    const cx = x + w / 2; // Center X of player (world coord)
    const cy = y + h / 2; // Center Y of player (screen coord)

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = player.bodyColor;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;

    // Draw blob-like body
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

    // Eyes (using player.eyeLeft/eyeRight properties)
    ctx.fillStyle = player.eyeLeft.color;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    // Eye positions are relative to player's top-left corner (x,y)
    const eyeLX = x + player.eyeLeft.x, eyeLY = y + player.eyeLeft.y;
    ctx.beginPath(); ctx.arc(eyeLX, eyeLY, player.eyeLeft.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = player.eyeLeft.pupilColor;
    const pupilLX = x + player.eyeLeft.pupilX, pupilLY = y + player.eyeLeft.pupilY;
    ctx.beginPath(); ctx.arc(pupilLX, pupilLY, player.eyeLeft.radius * 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = player.eyeRight.color;
    ctx.strokeStyle = "#000";
    const eyeRX = x + player.eyeRight.x, eyeRY = y + player.eyeRight.y;
    ctx.beginPath(); ctx.arc(eyeRX, eyeRY, player.eyeRight.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = player.eyeRight.pupilColor;
    const pupilRX = x + player.eyeRight.pupilX, pupilRY = y + player.eyeRight.pupilY;
    ctx.beginPath(); ctx.arc(pupilRX, pupilRY, player.eyeRight.radius * 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
}


// --- Platform Generation (adapted to use getPlatformWidth) ---
window.createPlatforms = function() {
    console.log("Calling createPlatforms()");
    window.gameState.platforms = []; // Clear existing platforms for a new game
    window.gameState.gameCoins = []; // Clear existing coins

    // Initial platform at the bottom (World coordinates)
    const initialPlatformY = window.gameState.canvas.height - window.gameState.platformHeight;
    window.gameState.platforms.push({
        x: (window.gameState.canvas.width - window.getPlatformWidth()) / 2, // Center the first platform
        y: initialPlatformY, // World Y
        width: window.getPlatformWidth(),
        height: window.gameState.platformHeight,
        type: 'normal',
        color: '#1a1a1a', // Dark grey for ground
        phase: Math.random() * Math.PI * 2 // For wobble
    });

    // Place player on the initial bottom platform in world coordinates.
    window.gameState.player.x = (window.gameState.canvas.width - window.gameState.player.width) / 2;
    window.gameState.player.y = initialPlatformY - window.gameState.player.height;

    // Generate platforms upwards from the initial platform
    // Y decreases as we go up in world coordinates
    let currentY = initialPlatformY - window.gameState.platformHeight * 2;
    // Generate enough platforms to fill screen + some buffer above
    const generateHeightBuffer = window.gameState.canvas.height * 2;

    while (currentY > initialPlatformY - generateHeightBuffer) {
        const gap = window.gameState.minPlatformGap + Math.random() * (window.gameState.maxPlatformGap - window.gameState.minPlatformGap);
        currentY -= gap; // Move world Y upwards (smaller Y value)

        const platformWidth = window.gameState.minPlatformWidth + Math.random() * (window.gameState.maxPlatformWidth - window.gameState.minPlatformWidth);
        const platformX = Math.random() * (window.gameState.canvas.width - platformWidth);

        let type = 'normal';
        const r = Math.random();
        if (r < window.gameState.spikePlatformChance) {
            type = 'spike';
        } else if (r < window.gameState.spikePlatformChance + window.gameState.bouncyPlatformChance) {
            type = 'bouncy';
        }

        const color = window.getPlatformColor(type);

        const newPlatform = {
            x: platformX,
            y: currentY, // This is a world coordinate
            width: platformWidth,
            height: window.gameState.platformHeight,
            type: type,
            color: color,
            phase: Math.random() * Math.PI * 2 // For wobble
        };
        window.gameState.platforms.push(newPlatform);

        // Optionally add a coin to this platform (coin.y is also world coord)
        if (Math.random() < window.gameState.coinGenerationChance) { // Use coinGenerationChance from game-state
            window.gameState.gameCoins.push({
                x: newPlatform.x + newPlatform.width / 2, // Centered on platform
                y: newPlatform.y - (window.gameState.coinRadius * 2) - 5, // Position slightly above the platform (using diameter)
                collected: false
            });
        }
    }
    console.log("createPlatforms() finished. Total platforms created:", window.gameState.platforms.length);
};

window.generateNewPlatformsAndCoins = function() {
    // Determine cutoff based on gravity mode
    const cutoffY = window.gameState.worldOffsetY + (window.gameState.chaosMode === "gravity_flip" ? window.gameState.canvas.height + 100 : -100);
    const filterCondition = (p) => window.gameState.chaosMode === "gravity_flip" ? p.y < cutoffY : p.y > cutoffY;

    // Remove platforms and coins that are far off-screen
    window.gameState.platforms = window.gameState.platforms.filter(filterCondition);
    window.gameState.gameCoins = window.gameState.gameCoins.filter(filterCondition);

    // Find the relevant "extreme" platform to generate from
    let extremePlatformY;
    if (window.gameState.chaosMode === "gravity_flip") {
        extremePlatformY = window.gameState.platforms.reduce((maxY, p) => Math.max(maxY, p.y), -Infinity);
    } else {
        extremePlatformY = window.gameState.platforms.reduce((minY, p) => Math.min(minY, p.y), Infinity);
    }

    // Generate new platforms and coins
    const generateBuffer = window.gameState.canvas.height; // Generate for one screen height buffer
    let currentY = extremePlatformY;
    const targetY = window.gameState.worldOffsetY + (window.gameState.chaosMode === "gravity_flip" ? -generateBuffer : generateBuffer);

    while ((window.gameState.chaosMode === "gravity_flip" && currentY < targetY) ||
           (window.gameState.chaosMode !== "gravity_flip" && currentY > targetY)) {
        const gap = window.gameState.minPlatformGap + Math.random() * (window.gameState.maxPlatformGap - window.gameState.minPlatformGap);

        if (window.gameState.chaosMode === "gravity_flip") {
            currentY += gap; // Move down for gravity flip
        } else {
            currentY -= gap; // Move up for normal gravity
        }

        const platformWidth = window.gameState.minPlatformWidth + Math.random() * (window.gameState.maxPlatformWidth - window.gameState.minPlatformWidth);
        const platformX = Math.random() * (window.gameState.canvas.width - platformWidth);

        let type = 'normal';
        const r = Math.random();
        if (r < window.gameState.spikePlatformChance) {
            type = 'spike';
        } else if (r < window.gameState.spikePlatformChance + window.gameState.bouncyPlatformChance) {
            type = 'bouncy';
        }

        const color = window.getPlatformColor(type);

        const newPlatform = {
            x: platformX,
            y: currentY, // This is a world coordinate
            width: platformWidth,
            height: window.gameState.platformHeight,
            type: type,
            color: color,
            phase: Math.random() * Math.PI * 2
        };
        window.gameState.platforms.push(newPlatform);

        if (Math.random() < window.gameState.coinGenerationChance) {
            window.gameState.gameCoins.push({
                x: newPlatform.x + newPlatform.width / 2,
                y: newPlatform.y + (window.gameState.chaosMode === "gravity_flip" ? newPlatform.height + (window.gameState.coinRadius * 2) + 5 : - (window.gameState.coinRadius * 2) - 5),
                collected: false
            });
        }
    }
};


// --- Helper Functions ---
// window.heightMeters is now in game-state.js
// window.getPlatformWidth is now in game-state.js

window.getCameraThreshold = function() {
    // This defines the y-coordinate on the SCREEN (relative to canvas top)
    // where the player will trigger the camera to scroll.
    if (!window.gameState.canvas) return 200; // Fallback if canvas not ready

    if (window.gameState.chaosMode === "gravity_flip") {
        return window.gameState.canvas.height * 0.6; // Player should not go below this point (on screen)
    } else {
        return window.gameState.canvas.height * 0.4; // Player should not go above this point (on screen)
    }
};

// window.updateUI is now in game-state.js

window.showChaosAlert = function(text) {
    if (window.gameState.chaosAlert) {
        window.gameState.chaosAlert.textContent = text;
        window.gameState.chaosAlert.style.display = "block";
        setTimeout(() => { window.gameState.chaosAlert.style.display = "none"; }, 2000);
    }
};


// Main chaos mode application logic (from inline script, adapted)
window.applyChaosMode = function(mode) {
    console.log("Applying Chaos Mode:", mode);
    window.gameState.chaosMode = mode;

    // Reset to base stats first
    window.gameState.player.speed = window.gameState.player.baseSpeed;
    window.gameState.player.maxSpeed = window.gameState.player.baseMaxSpeed;
    window.gameState.player.friction = window.gameState.player.baseFriction;
    window.gameState.player.gravity = window.gameState.player.baseGravity;
    window.gameState.player.jumpPower = window.gameState.player.baseJumpPower;

    // Reset player colors and eye positions to default normal
    window.gameState.player.bodyColor = "#9D4EDD"; // Default purple
    window.gameState.player.eyeLeft.color = "#FFD166";
    window.gameState.player.eyeLeft.pupilColor = "black";
    window.gameState.player.eyeRight.color = "#457B9D";
    window.gameState.player.eyeRight.pupilColor = "black";
    // Reset eye positions
    window.gameState.player.eyeLeft.y = 15;
    window.gameState.player.eyeLeft.pupilY = 17;
    window.gameState.player.eyeRight.y = 15;
    window.gameState.player.eyeRight.pupilY = 17;


    switch (mode) {
        case "normal":
            window.showChaosAlert("NORMAL MODE!");
            break;
        case "gravity_flip":
            window.showChaosAlert("GRAVITY FLIP!");
            window.gameState.player.gravity = -window.gameState.player.baseGravity; // Invert gravity
            window.gameState.player.jumpPower = -window.gameState.player.baseJumpPower; // Invert jump direction
            window.gameState.player.bodyColor = "#FF69B4"; // Pink
            // Adjust eye positions for visual effect in reverse gravity
            window.gameState.player.eyeLeft.y = window.gameState.player.height - 15;
            window.gameState.player.eyeLeft.pupilY = window.gameState.player.height - 17;
            window.gameState.player.eyeRight.y = window.gameState.player.height - 15;
            window.gameState.player.eyeRight.pupilY = window.gameState.player.height - 17;
            break;
        case "reverse_controls":
            window.showChaosAlert("REVERSE CONTROLS!");
            window.gameState.player.bodyColor = "#FFA500"; // Orange
            break;
        case "super_speed":
            window.showChaosAlert("SUPER SPEED!");
            window.gameState.player.speed = window.gameState.player.baseSpeed * 2.3; // Faster acceleration
            window.gameState.player.maxSpeed = window.gameState.player.baseMaxSpeed * 2; // Higher max speed
            window.gameState.player.bodyColor = "#00FFFF"; // Cyan
            break;
        case "slippery":
            window.showChaosAlert("SLIPPERY MODE!");
            window.gameState.player.friction = 0.98; // Less friction
            window.gameState.player.bodyColor = "#ADD8E6"; // Light Blue
            break;
        case "tiny_platforms":
            window.showChaosAlert("TINY PLATFORMS!");
            window.gameState.player.bodyColor = "#FFD700"; // Gold
            // Platform generation will use window.getPlatformWidth()
            break;
        case "bouncy":
            window.showChaosAlert("BOUNCY MODE!");
            window.gameState.player.jumpPower = -15.5; // Higher jump
            window.gameState.player.bodyColor = "#FF69B4"; // Pink (same as gravity flip, can differentiate if needed)
            break;
        case "slow_motion":
            window.showChaosAlert("SLOW MOTION!");
            window.gameState.player.speed = window.gameState.player.baseSpeed * 0.4;
            window.gameState.player.maxSpeed = window.gameState.player.baseMaxSpeed * 0.5;
            window.gameState.player.gravity = window.gameState.player.baseGravity * 0.4;
            window.gameState.player.jumpPower = window.gameState.player.baseJumpPower * 0.8;
            window.gameState.player.bodyColor = "#9370DB"; // Medium Purple
            break;
    }

    // Flash canvas for visual feedback (from inline script)
    if (window.gameState.canvas) {
        window.gameState.canvas.classList.add('chaos-flash');
        setTimeout(() => window.gameState.canvas.classList.remove('chaos-flash'), 500);
    }

    window.updateUI(); // Update UI to reflect changes
};