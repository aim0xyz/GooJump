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

    const dt = timestamp - (window.gameLoop.lastTS || timestamp);
    window.gameLoop.lastTS = timestamp;
    window.gameState.gameTimeMs += dt;

    window.updateGame(dt / 1000); // Update based on seconds
    window.drawGame();

    requestAnimationFrame(window.gameLoop);
};

// --- Game Logic Updates ---
window.updateGame = function(dt) {
    // Player horizontal movement
    if (window.gameState.inputLeft) {
        window.gameState.player.dx = Math.max(-window.gameState.player.maxSpeedX, window.gameState.player.dx - 0.5);
    } else if (window.gameState.inputRight) {
        window.gameState.player.dx = Math.min(window.gameState.player.maxSpeedX, window.gameState.player.dx + 0.5);
    } else {
        // Gradual deceleration
        if (window.gameState.player.dx > 0) window.gameState.player.dx = Math.max(0, window.gameState.player.dx - 0.2);
        if (window.gameState.player.dx < 0) window.gameState.player.dx = Math.min(0, window.gameState.player.dx + 0.2);
    }

    // Apply player horizontal movement
    window.gameState.player.x += window.gameState.player.dx;

    // Player horizontal boundary collision (wrap around)
    if (window.gameState.player.x + window.gameState.player.width < 0) {
        window.gameState.player.x = window.gameState.canvas.width;
    } else if (window.gameState.player.x > window.gameState.canvas.width) {
        window.gameState.player.x = -window.gameState.player.width;
    }

    // Apply gravity
    window.gameState.player.dy += window.gameState.player.gravity;
    window.gameState.player.y += window.gameState.player.dy;

    // Camera movement (scroll the world down)
    const cameraThreshold = window.getCameraThreshold();
    if (window.gameState.player.y < cameraThreshold) {
        const deltaY = cameraThreshold - window.gameState.player.y;
        window.gameState.worldOffsetY += deltaY;
        window.gameState.player.y = cameraThreshold;

        // Move existing platforms and coins down with the world
        window.gameState.platforms.forEach(p => p.y += deltaY);
        window.gameState.gameCoins.forEach(c => c.y += deltaY);

        // Generate new platforms and coins above the screen
        window.generateNewPlatformsAndCoins(deltaY);
    }

    // Platform collision
    window.gameState.platforms.forEach(p => {
        // Player is falling and intersects with platform
        if (window.gameState.player.dy > 0 &&
            window.gameState.player.x < p.x + p.width &&
            window.gameState.player.x + window.gameState.player.width > p.x &&
            window.gameState.player.y + window.gameState.player.height > p.y &&
            window.gameState.player.y + window.gameState.player.height < p.y + window.gameState.player.dy + p.height) // Check collision from above
        {
            if (p.type === 'normal' || p.type === 'bouncy') {
                window.gameState.player.dy = window.gameState.player.jumpPower * (p.type === 'bouncy' ? 1.5 : 1); // Jump off platform
                window.gameState.player.y = p.y - window.gameState.player.height; // Snap to top of platform
                window.gameState.player.squishT = 1; // Start squish animation
                if (Math.random() < window.gameState.gooSplatChance) { // Chance to leave a splat
                    window.gameState.gooSplats.push({
                        x: window.gameState.player.x + window.gameState.player.width / 2,
                        y: p.y,
                        radius: window.gameState.player.width / 2,
                        alpha: 1
                    });
                }
            } else if (p.type === 'spike') {
                // Instantly end game if hit spike platform from above
                console.log("Hit spike platform. Game Over.");
                window.endGame();
                return; // Stop processing to avoid further updates
            }
        }
    });

    // Check if player fell below screen
    if (window.gameState.player.y - window.gameState.worldOffsetY > window.gameState.canvas.height) {
        console.log("Player fell off screen. Game Over.");
        window.endGame();
    }

    // Coin collision
    window.gameState.gameCoins.forEach(c => {
        if (!c.collected &&
            window.gameState.player.x < c.x + window.gameState.coinRadius &&
            window.gameState.player.x + window.gameState.player.width > c.x - window.gameState.coinRadius &&
            window.gameState.player.y < c.y + window.gameState.coinRadius &&
            window.gameState.player.y + window.gameState.player.height > c.y - window.gameState.coinRadius)
        {
            c.collected = true;
            window.gameState.currentRoundCoins += window.gameState.coinValue;
            window.updateUI(); // Update UI immediately
        }
    });
    // Remove collected coins
    window.gameState.gameCoins = window.gameState.gameCoins.filter(c => !c.collected);


    // Update squish animation
    if (window.gameState.player.squishT > 0) {
        window.gameState.player.squishT = Math.max(0, window.gameState.player.squishT - 5 * dt);
    }

    // Update goo splats
    window.gameState.gooSplats.forEach(splat => {
        splat.alpha -= window.gameState.splatDecayRate * dt;
        splat.radius -= window.gameState.splatShrinkRate * dt;
    });
    window.gameState.gooSplats = window.gameState.gooSplats.filter(splat => splat.alpha > 0 && splat.radius > 0);

    // Chaos Mode Management
    if (window.gameState.gameTimeMs - window.gameState.lastChaosTime > window.gameState.chaosInterval) {
        window.gameState.lastChaosTime = window.gameState.gameTimeMs;
        const modes = ['reverseGravity', 'fastPlayer']; // Add more modes here
        const newMode = modes[Math.floor(Math.random() * modes.length)];
        window.applyChaosMode(newMode);

        // Schedule return to normal
        setTimeout(() => {
            window.applyChaosMode('normal');
        }, window.gameState.chaosDuration);
    }

    // Update UI (score, coins, hearts) - Now calls the updateUI defined in game-state.js
    window.updateUI();
};

// --- Drawing Functions ---
window.drawGame = function() {
    window.gameState.ctx.clearRect(0, 0, window.gameState.canvas.width, window.gameState.canvas.height); // Clear canvas
    window.gameState.ctx.fillStyle = '#0f0f0f'; // Dark background
    window.gameState.ctx.fillRect(0, 0, window.gameState.canvas.width, window.gameState.canvas.height);

    // Draw Goo Splats
    window.gameState.gooSplats.forEach(splat => {
        window.gameState.ctx.fillStyle = `rgba(54, 217, 109, ${splat.alpha})`; // Greenish with alpha
        window.gameState.ctx.beginPath();
        window.gameState.ctx.arc(splat.x, splat.y + window.gameState.worldOffsetY, splat.radius, 0, Math.PI * 2);
        window.gameState.ctx.fill();
    });

    // Draw Platforms
    for (let i = 0; i < window.gameState.platforms.length; i++) {
        const p = window.gameState.platforms[i];
        // Only draw platforms that are currently visible on screen
        if (p.y + window.gameState.worldOffsetY + p.height > 0 && p.y + window.gameState.worldOffsetY < window.gameState.canvas.height) {
            window.gameState.ctx.fillStyle = p.color;
            window.gameState.ctx.fillRect(p.x, p.y + window.gameState.worldOffsetY, p.width, p.height);

            // Draw special platform features (e.g., spikes for 'spike' platforms)
            if (p.type === 'spike') {
                window.gameState.ctx.fillStyle = '#ff0000'; // Red color for spikes
                const spikeHeight = p.height * 0.8; // Spikes are almost as tall as the platform
                const spikeWidth = p.width / 5; // Example: 5 spikes across the platform
                for (let j = 0; j < Math.ceil(p.width / (spikeWidth / 2)); j++) { // Ensure full coverage
                    const spikeX = p.x + j * (spikeWidth / 2);
                    const spikeY = p.y + window.gameState.worldOffsetY;
                    window.gameState.ctx.beginPath();
                    window.gameState.ctx.moveTo(spikeX, spikeY + p.height); // Bottom left of spike base
                    window.gameState.ctx.lineTo(spikeX + spikeWidth / 2, spikeY + p.height - spikeHeight); // Top point of spike
                    window.gameState.ctx.lineTo(spikeX + spikeWidth, spikeY + p.height); // Bottom right of spike base
                    window.gameState.ctx.closePath();
                    window.gameState.ctx.fill();
                }
            } else if (p.type === 'bouncy') {
                window.gameState.ctx.fillStyle = '#ADD8E6'; // Light blue for bouncy
                window.gameState.ctx.beginPath();
                window.gameState.ctx.arc(p.x + p.width / 2, p.y + window.gameState.worldOffsetY + p.height / 2, p.width / 4, 0, Math.PI * 2);
                window.gameState.ctx.fill();
            }
        }
    }

    // Draw Coins
    window.gameState.gameCoins.forEach(c => {
        if (!c.collected &&
            c.y + window.gameState.worldOffsetY + window.gameState.coinRadius > 0 &&
            c.y + window.gameState.worldOffsetY - window.gameState.coinRadius < window.gameState.canvas.height)
        {
            window.gameState.ctx.fillStyle = '#FFD700'; // Gold color
            window.gameState.ctx.beginPath();
            window.gameState.ctx.arc(c.x, c.y + window.gameState.worldOffsetY, window.gameState.coinRadius, 0, Math.PI * 2);
            window.gameState.ctx.fill();
        }
    });

    // Draw Player
    const player = window.gameState.player;
    const squishedWidth = player.width * (1 - player.maxSquish * player.squishT);
    const squishedHeight = player.height * (1 + player.maxSquish * player.squishT);
    const squishedX = player.x + (player.width - squishedWidth) / 2;
    const squishedY = player.y + (player.height - squishedHeight);

    window.gameState.ctx.fillStyle = player.bodyColor;
    window.gameState.ctx.fillRect(squishedX, squishedY, squishedWidth, squishedHeight);

    // Draw Player Eyes
    window.gameState.ctx.fillStyle = 'white';
    window.gameState.ctx.beginPath();
    window.gameState.ctx.arc(squishedX + player.eyeLeft.x, squishedY + player.eyeLeft.y, player.eyeLeft.radius, 0, Math.PI * 2);
    window.gameState.ctx.arc(squishedX + player.eyeRight.x, squishedY + player.eyeRight.y, player.eyeRight.radius, 0, Math.PI * 2);
    window.gameState.ctx.fill();

    window.gameState.ctx.fillStyle = 'black';
    window.gameState.ctx.beginPath();
    window.gameState.ctx.arc(squishedX + player.eyeLeft.pupilX, squishedY + player.eyeLeft.pupilY, player.eyeLeft.radius * 0.5, 0, Math.PI * 2);
    window.gameState.ctx.arc(squishedX + player.eyeRight.pupilX, squishedY + player.eyeRight.pupilY, player.eyeRight.radius * 0.5, 0, Math.PI * 2);
    window.gameState.ctx.fill();
};

// --- Platform Generation ---
window.createPlatforms = function() {
    console.log("Calling createPlatforms()");
    window.gameState.platforms = []; // Clear existing platforms for a new game

    // Initial platform (the ground or first platform) at the bottom
    window.gameState.platforms.push({
        x: 0,
        y: window.gameState.canvas.height - window.gameState.platformHeight,
        width: window.gameState.canvas.width,
        height: window.gameState.platformHeight,
        type: 'normal',
        color: '#1a1a1a' // Dark grey for ground
    });

    let currentY = window.gameState.canvas.height - window.gameState.platformHeight * 2; // Start generating above the first platform
    const generateHeight = window.gameState.canvas.height * 2; // Generate platforms for at least 2 screen heights
    console.log(`Generating platforms up to Y: ${-generateHeight}`);

    while (currentY > -generateHeight) {
        const gap = window.gameState.minPlatformGap + Math.random() * (window.gameState.maxPlatformGap - window.gameState.minPlatformGap);
        currentY -= gap; // Move up by gap

        const platformWidth = window.gameState.minPlatformWidth + Math.random() * (window.gameState.maxPlatformWidth - window.gameState.minPlatformWidth);
        const platformX = Math.random() * (window.gameState.canvas.width - platformWidth);

        let type = 'normal';
        // color will be set by getPlatformColor

        // Determine platform type based on chances
        const r = Math.random();
        if (r < window.gameState.spikePlatformChance) {
            type = 'spike';
        } else if (r < window.gameState.spikePlatformChance + window.gameState.bouncyPlatformChance) {
            type = 'bouncy';
        }

        const color = window.getPlatformColor(type); // Use global getPlatformColor

        const newPlatform = {
            x: platformX,
            y: currentY,
            width: platformWidth,
            height: window.gameState.platformHeight,
            type: type,
            color: color
        };
        window.gameState.platforms.push(newPlatform);

        // Optionally add a coin to this platform
        if (Math.random() < window.gameState.coinGenerationChance) {
            window.gameState.gameCoins.push({
                x: newPlatform.x + newPlatform.width / 2,
                y: newPlatform.y - window.gameState.coinRadius - 5, // Position slightly above the platform
                collected: false
            });
        }
    }
    console.log("createPlatforms() finished. Total platforms created:", window.gameState.platforms.length);
};

window.generateNewPlatformsAndCoins = function(deltaY) {
    // Remove platforms and coins that are far below the screen
    window.gameState.platforms = window.gameState.platforms.filter(p => p.y + p.height + window.gameState.worldOffsetY > 0);
    window.gameState.gameCoins = window.gameState.gameCoins.filter(c => c.y + window.gameState.coinRadius + window.gameState.worldOffsetY > 0);

    // Find the highest platform currently generated
    const highestPlatformY = window.gameState.platforms.reduce((minY, p) => Math.min(minY, p.y), 0);

    // Generate new platforms and coins above the highest existing one
    let currentY = highestPlatformY;
    const generateMoreHeight = window.gameState.canvas.height; // Generate for one more screen height
    while (currentY > highestPlatformY - generateMoreHeight) { // Generate new platforms as the camera moves up
        const gap = window.gameState.minPlatformGap + Math.random() * (window.gameState.maxPlatformGap - window.gameState.minPlatformGap);
        currentY -= gap;

        const platformWidth = window.gameState.minPlatformWidth + Math.random() * (window.gameState.maxPlatformWidth - window.gameState.minPlatformWidth);
        const platformX = Math.random() * (window.gameState.canvas.width - platformWidth);

        let type = 'normal';
        // color will be set by getPlatformColor

        const r = Math.random();
        if (r < window.gameState.spikePlatformChance) {
            type = 'spike';
        } else if (r < window.gameState.spikePlatformChance + window.gameState.bouncyPlatformChance) {
            type = 'bouncy';
        }

        const color = window.getPlatformColor(type);

        const newPlatform = {
            x: platformX,
            y: currentY,
            width: platformWidth,
            height: window.gameState.platformHeight,
            type: type,
            color: color
        };
        window.gameState.platforms.push(newPlatform);

        if (Math.random() < window.gameState.coinGenerationChance) {
            window.gameState.gameCoins.push({
                x: newPlatform.x + newPlatform.width / 2,
                y: newPlatform.y - window.gameState.coinRadius - 5,
                collected: false
            });
        }
    }
};

// --- Helper Functions ---
// window.heightMeters is now in game-state.js

window.getCameraThreshold = function() {
    // Player should be snapped to this Y position as the camera scrolls
    // Make sure window.gameState.canvas.height is defined (it should be after DOMContentLoaded)
    return window.gameState.canvas ? window.gameState.canvas.height * 0.4 : 200; // Fallback if canvas height not ready
};

// window.updateUI is now in game-state.js

window.applyChaosMode = function(mode) {
    console.log("Applying Chaos Mode:", mode);
    window.gameState.chaosMode = mode;
    // Reset player colors and eye positions to default normal before applying new mode's changes
    window.gameState.player.bodyColor = '#36D96D'; // Normal green
    window.gameState.player.eyeLeft.y = 10;
    window.gameState.player.eyeLeft.pupilY = 12;
    window.gameState.player.eyeRight.y = 10;
    window.gameState.player.eyeRight.pupilY = 12;

    switch (mode) {
        case 'normal':
            window.gameState.player.gravity = 0.3; // Base gravity
            window.gameState.player.jumpPower = -10; // Base jump power
            window.gameState.player.maxSpeedX = 5; // Base max speed
            break;
        case 'reverseGravity':
            window.gameState.player.gravity = -0.3 * window.gameState.chaosGravityMultiplier; // Negative gravity
            // Adjust jump power direction and magnitude
            window.gameState.player.jumpPower = 10 * window.gameState.chaosJumpPowerMultiplier;
            window.gameState.player.maxSpeedX = 5;
            window.gameState.player.bodyColor = '#800080'; // Purple
            // Adjust eyes to appear "upside down" or at bottom
            window.gameState.player.eyeLeft.y = window.gameState.player.height - 10;
            window.gameState.player.eyeLeft.pupilY = window.gameState.player.height - 12;
            window.gameState.player.eyeRight.y = window.gameState.player.height - 10;
            window.gameState.player.eyeRight.pupilY = window.gameState.player.height - 12;
            break;
        case 'fastPlayer':
            window.gameState.player.gravity = 0.3;
            window.gameState.player.jumpPower = -10;
            window.gameState.player.maxSpeedX = 5 * window.gameState.chaosPlayerSpeedMultiplier; // Faster horizontal speed
            window.gameState.player.bodyColor = '#00FFFF'; // Cyan
            break;
        // Add more chaos modes as needed
    }
    window.updateUI(); // Update UI to reflect changes
};

// window.getPlatformColor is now in game-state.js