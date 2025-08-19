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
    window.gameState.player.y += window.gameState.player.dy; // Player Y is a world coordinate

    // Camera movement (scroll the world based on player's world Y position)
    // `cameraTriggerY` is a point on the SCREEN where the player should not go above.
    // Convert player's world Y to their current SCREEN Y: `screenPlayerY = player.y - worldOffsetY`.
    const screenPlayerY = window.gameState.player.y - window.gameState.worldOffsetY;
    const cameraTriggerY = window.gameState.canvas.height * 0.4; // e.g., 40% from top of screen

    if (screenPlayerY < cameraTriggerY) {
        // Player is moving above the trigger point on the screen.
        // Adjust worldOffsetY to keep the player at or below the trigger.
        const deltaCameraScroll = cameraTriggerY - screenPlayerY; // How much we need to shift the world view
        window.gameState.worldOffsetY -= deltaCameraScroll; // Decrease worldOffsetY (camera moves up, making world appear to scroll down)
        // IMPORTANT: player.y, p.y, c.y (all game world coordinates) DO NOT CHANGE here.
        // Only worldOffsetY changes, shifting the view.
    }

    // Platform collision (player.y and p.y are both world coordinates, so direct comparison is correct)
    window.gameState.platforms.forEach(p => {
        if (window.gameState.player.dy > 0 && // Only check when falling
            window.gameState.player.x < p.x + p.width &&
            window.gameState.player.x + window.gameState.player.width > p.x &&
            window.gameState.player.y + window.gameState.player.height > p.y && // Player bottom intersects platform top
            window.gameState.player.y + window.gameState.player.height < p.y + window.gameState.player.dy + p.height) // Player was above platform in previous frame
        {
            if (p.type === 'normal' || p.type === 'bouncy') {
                window.gameState.player.dy = window.gameState.player.jumpPower * (p.type === 'bouncy' ? 1.5 : 1);
                window.gameState.player.y = p.y - window.gameState.player.height; // Snap player to top of platform (world coord)
                window.gameState.player.squishT = 1;
                if (Math.random() < window.gameState.gooSplatChance) {
                    window.gameState.gooSplats.push({
                        x: window.gameState.player.x + window.gameState.player.width / 2,
                        y: p.y, // Goo splat also uses world coordinates
                        radius: window.gameState.player.width / 2,
                        alpha: 1
                    });
                }
            } else if (p.type === 'spike') {
                console.log("Hit spike platform. Game Over.");
                window.endGame();
                return; // Stop processing to avoid further updates
            }
        }
    });

    // Check if player fell below screen
    // Player's screen Y position: `window.gameState.player.y - window.gameState.worldOffsetY`
    if (window.gameState.player.y - window.gameState.worldOffsetY > window.gameState.canvas.height) {
        console.log("Player fell off screen. Game Over.");
        window.endGame();
    }

    // Coin collision (x, y are world coordinates)
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

    // Update UI (score, coins, hearts) - Calls the updateUI defined in game-state.js
    window.updateUI();
};

// --- Drawing Functions ---
window.drawGame = function() {
    window.gameState.ctx.clearRect(0, 0, window.gameState.canvas.width, window.gameState.canvas.height);
    // Set canvas background to match CSS body background for consistent look
    window.gameState.ctx.fillStyle = '#0f2027';
    window.gameState.ctx.fillRect(0, 0, window.gameState.canvas.width, window.gameState.canvas.height);

    // Draw Goo Splats (y is world coord, subtract worldOffsetY for screen coord)
    window.gameState.gooSplats.forEach(splat => {
        window.gameState.ctx.fillStyle = `rgba(54, 217, 109, ${splat.alpha})`;
        window.gameState.ctx.beginPath();
        window.gameState.ctx.arc(splat.x, splat.y - window.gameState.worldOffsetY, splat.radius, 0, Math.PI * 2);
        window.gameState.ctx.fill();
    });

    // Draw Platforms (y is world coord, subtract worldOffsetY for screen coord)
    for (let i = 0; i < window.gameState.platforms.length; i++) {
        const p = window.gameState.platforms[i];
        const screenY = p.y - window.gameState.worldOffsetY; // Calculate screen Y for drawing and visibility
        // Only draw platforms that are currently visible on screen
        if (screenY + p.height > 0 && screenY < window.gameState.canvas.height) {
            window.gameState.ctx.fillStyle = p.color;
            window.gameState.ctx.fillRect(p.x, screenY, p.width, p.height);

            // Draw special platform features (e.g., spikes for 'spike' platforms)
            if (p.type === 'spike') {
                window.gameState.ctx.fillStyle = '#ff0000';
                const spikeHeight = p.height * 0.8;
                const spikeWidth = p.width / 5;
                for (let j = 0; j < Math.ceil(p.width / (spikeWidth / 2)); j++) {
                    const spikeX = p.x + j * (spikeWidth / 2);
                    const spikeY = screenY; // Use screenY for spikes too
                    window.gameState.ctx.beginPath();
                    window.gameState.ctx.moveTo(spikeX, spikeY + p.height);
                    window.gameState.ctx.lineTo(spikeX + spikeWidth / 2, spikeY + p.height - spikeHeight);
                    window.gameState.ctx.lineTo(spikeX + spikeWidth, spikeY + p.height);
                    window.gameState.ctx.closePath();
                    window.gameState.ctx.fill();
                }
            } else if (p.type === 'bouncy') {
                window.gameState.ctx.fillStyle = '#ADD8E6';
                window.gameState.ctx.beginPath();
                window.gameState.ctx.arc(p.x + p.width / 2, screenY + p.height / 2, p.width / 4, 0, Math.PI * 2);
                window.gameState.ctx.fill();
            }
        }
    }

    // Draw Coins (y is world coord, subtract worldOffsetY for screen coord)
    window.gameState.gameCoins.forEach(c => {
        const screenY = c.y - window.gameState.worldOffsetY; // Calculate screen Y
        if (!c.collected &&
            screenY + window.gameState.coinRadius > 0 &&
            screenY - window.gameState.coinRadius < window.gameState.canvas.height)
        {
            window.gameState.ctx.fillStyle = '#FFD700';
            window.gameState.ctx.beginPath();
            window.gameState.ctx.arc(c.x, screenY, window.gameState.coinRadius, 0, Math.PI * 2);
            window.gameState.ctx.fill();
        }
    });

    // Draw Player (y is world coord, subtract worldOffsetY for screen coord)
    const player = window.gameState.player;
    const squishedWidth = player.width * (1 - player.maxSquish * player.squishT);
    const squishedHeight = player.height * (1 + player.maxSquish * player.squishT);
    const squishedX = player.x + (player.width - squishedWidth) / 2;
    // Player's screen Y, adjusted for squish:
    const squishedY = player.y - window.gameState.worldOffsetY + (player.height - squishedHeight);

    window.gameState.ctx.fillStyle = player.bodyColor;
    window.gameState.ctx.fillRect(squishedX, squishedY, squishedWidth, squishedHeight);

    // Draw Player Eyes
    window.gameState.ctx.fillStyle = player.eyeLeft.color; // Use defined eye color
    window.gameState.ctx.beginPath();
    window.gameState.ctx.arc(squishedX + player.eyeLeft.x, squishedY + player.eyeLeft.y, player.eyeLeft.radius, 0, Math.PI * 2);
    window.gameState.ctx.arc(squishedX + player.eyeRight.x, squishedY + player.eyeRight.y, player.eyeRight.radius, 0, Math.PI * 2);
    window.gameState.ctx.fill();

    window.gameState.ctx.fillStyle = player.eyeLeft.pupilColor; // Use defined pupil color
    window.gameState.ctx.beginPath();
    window.gameState.ctx.arc(squishedX + player.eyeLeft.pupilX, squishedY + player.eyeLeft.pupilY, player.eyeLeft.radius * 0.5, 0, Math.PI * 2);
    window.gameState.ctx.arc(squishedX + player.eyeRight.pupilX, squishedY + player.eyeRight.pupilY, player.eyeRight.radius * 0.5, 0, Math.PI * 2);
    window.gameState.ctx.fill();
};

// --- Platform Generation ---
window.createPlatforms = function() {
    console.log("Calling createPlatforms()");
    window.gameState.platforms = []; // Clear existing platforms for a new game

    // Initial platform at the bottom (World coordinates)
    const initialPlatformY = window.gameState.canvas.height - window.gameState.platformHeight;
    window.gameState.platforms.push({
        x: 0,
        y: initialPlatformY, // World Y
        width: window.gameState.canvas.width,
        height: window.gameState.platformHeight,
        type: 'normal',
        color: '#1a1a1a' // Dark grey for ground
    });

    // Generate platforms upwards from the initial platform
    // Y decreases as we go up in world coordinates
    let currentY = initialPlatformY - window.gameState.platformHeight * 2;
    const generateHeightAboveScreen = window.gameState.canvas.height * 2; // Generate for at least 2 screen heights above initial

    while (currentY > initialPlatformY - generateHeightAboveScreen) { // Continue generating above the initial platform area
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
            color: color
        };
        window.gameState.platforms.push(newPlatform);

        // Optionally add a coin to this platform (coin.y is also world coord)
        if (Math.random() < window.gameState.coinGenerationChance) {
            window.gameState.gameCoins.push({
                x: newPlatform.x + newPlatform.width / 2,
                y: newPlatform.y - window.gameState.coinRadius - 5,
                collected: false
            });
        }
    }
    console.log("createPlatforms() finished. Total platforms created:", window.gameState.platforms.length);
};

window.generateNewPlatformsAndCoins = function(deltaY) {
    // Remove platforms and coins that are far above the current camera view.
    // If a platform's bottom edge (p.y + p.height) is above the current camera's top edge (worldOffsetY), remove it.
    // Add a buffer (e.g., 100 pixels) to avoid culling visible elements prematurely.
    window.gameState.platforms = window.gameState.platforms.filter(p => p.y + p.height >= window.gameState.worldOffsetY - 100);
    window.gameState.gameCoins = window.gameState.gameCoins.filter(c => c.y + window.gameState.coinRadius >= window.gameState.worldOffsetY - 100);

    // Find the highest platform currently generated (highest means smallest Y in world coords)
    // If no platforms exist (e.g., after filter), set a starting point far above.
    const highestPlatformY = window.gameState.platforms.reduce((minY, p) => Math.min(minY, p.y), Infinity);

    // Generate new platforms and coins above the highest existing one
    let currentY = highestPlatformY;
    const generateBuffer = window.gameState.canvas.height; // Generate for one more screen height buffer

    while (currentY > window.gameState.worldOffsetY - generateBuffer) { // Generate up to 1 screen above current camera top
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
    // This defines the y-coordinate on the SCREEN (relative to canvas top)
    // where the player will trigger the camera to scroll up.
    // Make sure window.gameState.canvas.height is defined (it should be after DOMContentLoaded).
    return window.gameState.canvas ? window.gameState.canvas.height * 0.4 : 200; // Fallback if canvas height not ready
};

// window.updateUI is now in game-state.js

window.applyChaosMode = function(mode) {
    console.log("Applying Chaos Mode:", mode);
    window.gameState.chaosMode = mode;
    // Reset player colors and eye positions to default normal before applying new mode's changes
    window.gameState.player.bodyColor = "#9D4EDD"; // Default purple
    window.gameState.player.eyeLeft = {x: 15, y: 15, radius: 5, pupilX: 18, pupilY: 17, color: "#FFD166", pupilColor: "black"};
    window.gameState.player.eyeRight = {x: 45, y: 15, radius: 5, pupilX: 42, pupilY: 17, color: "#457B9D", pupilColor: "black"};


    switch (mode) {
        case 'normal':
            window.gameState.player.gravity = 0.3; // Base gravity
            window.gameState.player.jumpPower = -10; // Base jump power
            window.gameState.player.maxSpeedX = 5; // Base max speed
            break;
        case 'reverseGravity':
            window.gameState.player.gravity = -0.3 * window.gameState.chaosGravityMultiplier; // Negative gravity
            // Adjust jump power direction and magnitude for "jumping down"
            window.gameState.player.jumpPower = 10 * window.gameState.chaosJumpPowerMultiplier;
            window.gameState.player.maxSpeedX = 5;
            window.gameState.player.bodyColor = '#800080'; // Purple for reverse gravity
            // Adjust eye positions for visual effect in reverse gravity
            window.gameState.player.eyeLeft.y = window.gameState.player.height - 15;
            window.gameState.player.eyeLeft.pupilY = window.gameState.player.height - 17;
            window.gameState.player.eyeRight.y = window.gameState.player.height - 15;
            window.gameState.player.eyeRight.pupilY = window.gameState.player.height - 17;
            break;
        case 'fastPlayer':
            window.gameState.player.gravity = 0.3;
            window.gameState.player.jumpPower = -10;
            window.gameState.player.maxSpeedX = 5 * window.gameState.chaosPlayerSpeedMultiplier; // Faster horizontal speed
            window.gameState.player.bodyColor = '#00FFFF'; // Cyan for fast player
            break;
        // Add more chaos modes as needed
    }
    window.updateUI(); // Update UI to reflect changes
};

// window.getPlatformColor is now in game-state.js