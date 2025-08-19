// js/game-logic.js

// Initialize Game State with UI elements as null initially
window.gameState = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null, // Context will be set on DOMContentLoaded
    player: {
        x: 0, y: 0, dx: 0, dy: 0,
        width: 40, height: 40,
        bodyColor: '#36D96D', // Green for normal
        eyeLeft: {x: 10, y: 10, radius: 5, pupilX: 12, pupilY: 12},
        eyeRight: {x: 30, y: 10, radius: 5, pupilX: 28, pupilY: 12},
        jumpPower: -10, // Initial jump power
        maxSpeedX: 5,
        gravity: 0.3,
        squishT: 0, // Squish animation timer
        maxSquish: 0.1 // Max squish amount
    },
    platforms: [],
    platformHeight: 15,
    minPlatformGap: 80,
    maxPlatformGap: 150,
    minPlatformWidth: 60,
    maxPlatformWidth: 120,
    worldOffsetY: 0, // How much the world has scrolled down
    gameRunning: false,
    inputLeft: false,
    inputRight: false,
    gooSplats: [],
    splatDecayRate: 0.05,
    splatShrinkRate: 0.5,
    gameCoins: [],
    coinRadius: 8,
    coinValue: 1, // How many coins each collected coin is worth

    // Game Stats / Player Data (will be loaded/saved from Firebase)
    totalCoins: 0,
    hearts: 1,
    maxHeight: 0, // Max height achieved across all runs

    // Current Round Stats
    currentRoundCoins: 0,
    currentRevivesUsed: 0,
    maxRevivesPerGame: 1, // Only 1 revive per game session

    // UI elements (initially null, assigned in DOMContentLoaded)
    scoreDisplay: null,
    coinsDisplay: null,
    heartsDisplay: null,
    chaosTimerDisplay: null,
    chaosAlert: null,
    leftZone: null,
    rightZone: null,

    // Firebase refs
    currentUserDataRef: null,

    // Shop Items
    shopItems: {
        heart: { cost: 50, name: "Heart" }
    },

    // Chaos Mode
    chaosMode: 'normal',
    chaosDuration: 10000, // 10 seconds
    chaosInterval: 30000, // Every 30 seconds
    lastChaosTime: 0,
    gameTimeMs: 0, // Total milliseconds game has been running
    chaosGravityMultiplier: 1.5,
    chaosJumpPowerMultiplier: 0.7,
    chaosPlayerSpeedMultiplier: 1.5,
    spikePlatformChance: 0.1, // 10% chance for spike platforms
    bouncyPlatformChance: 0.1, // 10% chance for bouncy platforms
    gooSplatChance: 0.05, // 5% chance to leave a splat on jump
    coinGenerationChance: 0.6 // 60% chance for a coin to spawn on a platform
};

// --- Initial Canvas and UI Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    window.gameState.ctx = window.gameState.canvas.getContext('2d');
    window.gameState.canvas.width = 400; // Example width
    window.gameState.canvas.height = 500; // Example height
    console.log("Canvas context initialized. Canvas dimensions:", window.gameState.canvas.width, "x", window.gameState.canvas.height);

    // Assign UI element references after DOM is ready
    window.gameState.scoreDisplay = document.getElementById("scoreDisplay");
    window.gameState.coinsDisplay = document.getElementById("coinsDisplay");
    window.gameState.heartsDisplay = document.getElementById("heartsDisplay");
    window.gameState.chaosTimerDisplay = document.getElementById("chaosTimerDisplay");
    window.gameState.chaosAlert = document.getElementById("chaosAlert");
    window.gameState.leftZone = document.getElementById("leftTouchZone");
    window.gameState.rightZone = document.getElementById("rightTouchZone");

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

    // Player horizontal boundary collision
    if (window.gameState.player.x < 0) {
        window.gameState.player.x = 0;
        window.gameState.player.dx = 0;
    } else if (window.gameState.player.x + window.gameState.player.width > window.gameState.canvas.width) {
        window.gameState.player.x = window.gameState.canvas.width - window.gameState.player.width;
        window.gameState.player.dx = 0;
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

    // Update UI (score, coins, hearts)
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
        let color = '#333333'; // Default normal platform color

        // Determine platform type based on chances
        const r = Math.random();
        if (r < window.gameState.spikePlatformChance) {
            type = 'spike';
        } else if (r < window.gameState.spikePlatformChance + window.gameState.bouncyPlatformChance) {
            type = 'bouncy';
        }

        color = window.getPlatformColor(type);

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
        let color = '#333333';

        const r = Math.random();
        if (r < window.gameState.spikePlatformChance) {
            type = 'spike';
        } else if (r < window.gameState.spikePlatformChance + window.gameState.bouncyPlatformChance) {
            type = 'bouncy';
        }

        color = window.getPlatformColor(type);

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
    // console.log("Generated new platforms. Total:", window.gameState.platforms.length);
};

// --- Helper Functions ---
window.heightMeters = function() {
    return Math.floor(Math.abs(window.gameState.worldOffsetY / 10)); // Convert pixels to meters (10px = 1m)
};

window.getCameraThreshold = function() {
    // Player should be snapped to this Y position as the camera scrolls
    return window.gameState.canvas.height * 0.4; // Example: 40% up from the bottom
};

window.updateUI = function() {
    // Update Score/Height
    if (window.gameState.scoreDisplay) { // Added check
        window.gameState.scoreDisplay.textContent = `Height: ${window.heightMeters()}m`;
    }
    // Update Coins (current round + total)
    if (window.gameState.coinsDisplay) { // Added check
        window.gameState.coinsDisplay.textContent = `Coins: ${window.gameState.currentRoundCoins} (+${window.gameState.totalCoins})`;
    }
    // Update Hearts
    if (window.gameState.heartsDisplay) { // Added check
        window.gameState.heartsDisplay.textContent = `Hearts: ${window.gameState.hearts}`;
    }

    // Update Chaos Timer (if active)
    if (window.gameState.chaosTimerDisplay && window.gameState.chaosAlert) { // Added check
        if (window.gameState.chaosMode !== 'normal') {
            const timeRemaining = Math.max(0, window.gameState.chaosDuration - (window.gameState.gameTimeMs - window.gameState.lastChaosTime));
            window.gameState.chaosTimerDisplay.textContent = `Chaos: ${Math.ceil(timeRemaining / 1000)}s`;
            window.gameState.chaosTimerDisplay.style.color = 'red';
            window.gameState.chaosAlert.style.display = 'block';
            window.gameState.chaosAlert.textContent = `Chaos Mode: ${window.gameState.chaosMode.toUpperCase()}!`;
        } else {
            window.gameState.chaosTimerDisplay.textContent = '';
            window.gameState.chaosTimerDisplay.style.color = '';
            window.gameState.chaosAlert.style.display = 'none';
        }
    }

    // Update shop screen if visible
    if (window.shopScreen && window.shopScreen.style.display === 'flex' && window.shopCoinsDisplay) { // Added checks
        window.shopCoinsDisplay.textContent = window.gameState.totalCoins;
    }
};

window.applyChaosMode = function(mode) {
    console.log("Applying Chaos Mode:", mode);
    window.gameState.chaosMode = mode;
    window.gameState.player.bodyColor = '#36D96D'; // Reset to normal green

    switch (mode) {
        case 'normal':
            window.gameState.player.gravity = 0.3;
            window.gameState.player.jumpPower = -10;
            window.gameState.player.maxSpeedX = 5;
            window.gameState.player.bodyColor = '#36D96D'; // Normal green
            break;
        case 'reverseGravity':
            window.gameState.player.gravity = -0.3; // Negative gravity
            window.gameState.player.jumpPower = 10; // Jump "down"
            window.gameState.player.maxSpeedX = 5;
            window.gameState.player.bodyColor = '#800080'; // Purple
            break;
        case 'fastPlayer':
            window.gameState.player.gravity = 0.3;
            window.gameState.player.jumpPower = -10;
            window.gameState.player.maxSpeedX = 8; // Faster horizontal speed
            window.gameState.player.bodyColor = '#00FFFF'; // Cyan
            break;
        // Add more chaos modes as needed
    }
    window.updateUI(); // Update UI to reflect changes
};

window.getPlatformColor = function(type) {
    switch (type) {
        case 'normal': return '#333333'; // Dark grey
        case 'spike':  return '#8B0000'; // Dark red
        case 'bouncy': return '#00BFFF'; // Deep sky blue
        default:       return '#333333';
    }
};