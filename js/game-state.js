// js/game-state.js

// Central game state object
window.gameState = {
    // Canvas and Context (will be assigned in game-logic.js's DOMContentLoaded)
    canvas: null,
    ctx: null,

    // UI Elements (will be assigned in game-logic.js's DOMContentLoaded)
    scoreDisplay: null,
    coinsDisplay: null,
    heartsDisplay: null,
    chaosTimerDisplay: null,
    chaosAlert: null,

    // Touch Zones (will be assigned in game-logic.js's DOMContentLoaded)
    leftZone: null,
    rightZone: null,

    // Game Control Flags
    gameRunning: false,
    worldOffsetY: 0,
    gameTimeMs: 0,
    lastChaosTime: 0,

    // Currency and Player Stats (loaded from Firebase)
    totalCoins: 0,
    currentRoundCoins: 0,
    hearts: 1,
    maxHeight: 0, // Highest score achieved by user

    maxRevivesPerGame: 1,
    currentRevivesUsed: 0,
    lastDeathState: null, // For revive functionality

    // Game Objects
    platforms: [],
    gameCoins: [], // { x, y, collected }
    gooSplats: [],
    splatDecayRate: 0.05, // Added splat rates from old game-logic
    splatShrinkRate: 0.5, // Added splat rates from old game-logic

    // Input State
    inputLeft: false,
    inputRight: false,

    // CHAOS MODE CONFIGURATION (moved from old game-logic.js for centralization)
    chaosMode: 'normal', // Current active chaos mode
    chaosDuration: 10000, // 10 seconds a chaos mode lasts
    chaosInterval: 30000, // Every 30 seconds a new chaos mode triggers
    chaosGravityMultiplier: 1.5,
    chaosJumpPowerMultiplier: 0.7,
    chaosPlayerSpeedMultiplier: 1.5,
    spikePlatformChance: 0.1, // 10% chance for spike platforms
    bouncyPlatformChance: 0.1, // 10% chance for bouncy platforms
    gooSplatChance: 0.05, // 5% chance to leave a splat on jump
    coinGenerationChance: 0.6, // 60% chance for a coin to spawn on a platform

    // Shop Items
    shopItems: {
        heart: { cost: 50, name: "Heart" }
    },

    // Player Object
    player: {
        x: 0, y: 0, // Initial positions will be set in startGame()
        dx: 0, dy: 0,
        width: 40, height: 40, // Consistent dimensions
        bodyColor: '#36D96D', // Green for normal
        eyeLeft: {x: 10, y: 10, radius: 5, pupilX: 12, pupilY: 12},
        eyeRight: {x: 30, y: 10, radius: 5, pupilX: 28, pupilY: 12},
        jumpPower: -10, // Base jump power
        maxSpeedX: 5, // Base max horizontal speed
        gravity: 0.3, // Base gravity
        squishT: 0, // Squish animation timer
        maxSquish: 0.1 // Max squish amount
    },

    // Platform Constants (moved from old game-logic.js)
    platformHeight: 15,
    minPlatformGap: 80,
    maxPlatformGap: 150,
    minPlatformWidth: 60,
    maxPlatformWidth: 120,

    // Coin Constants
    coinRadius: 8,
    coinValue: 1,

    // Firebase Data Reference
    currentUserDataRef: null,
};

// Expose helper functions globally
window.heightMeters = function() {
    return Math.floor(Math.abs(window.gameState.worldOffsetY / 10)); // 10px = 1m
};

window.getPlatformColor = function(type) {
    switch (type) {
        case 'normal': return '#333333'; // Dark grey
        case 'spike':  return '#8B0000'; // Dark red
        case 'bouncy': return '#00BFFF'; // Deep sky blue
        default:       return '#333333';
    }
};

// Define updateUI here so it's available early for data-management.js
window.updateUI = function() {
    // Update Score/Height
    // Check if the element exists before trying to access its properties
    if (window.gameState.scoreDisplay) {
        window.gameState.scoreDisplay.textContent = `Height: ${window.heightMeters()}m`;
    }
    // Update Coins (current round + total)
    if (window.gameState.coinsDisplay) {
        window.gameState.coinsDisplay.textContent = `Coins: ${window.gameState.currentRoundCoins} (+${window.gameState.totalCoins})`;
    }
    // Update Hearts
    if (window.gameState.heartsDisplay) {
        window.gameState.heartsDisplay.textContent = `Hearts: ❤️ ${window.gameState.hearts}`;
    }

    // Update Chaos Timer (if active)
    // Check for window.gameState.canvas here as well, as chaos-flash class is applied to it
    if (window.gameState.chaosTimerDisplay && window.gameState.chaosAlert && window.gameState.canvas) {
        if (window.gameState.chaosMode !== 'normal') {
            const timeRemaining = Math.max(0, window.gameState.chaosDuration - (window.gameState.gameTimeMs - window.gameState.lastChaosTime));
            window.gameState.chaosTimerDisplay.textContent = `Chaos: ${Math.ceil(timeRemaining / 1000)}s`;
            window.gameState.chaosTimerDisplay.style.color = 'red';
            window.gameState.chaosAlert.style.display = 'block';
            window.gameState.chaosAlert.textContent = `${window.gameState.chaosMode.toUpperCase()}!`;
            // Apply visual effect to canvas
            window.gameState.canvas.classList.add('chaos-flash');
        } else {
            const timeToNextChaos = Math.max(0, window.gameState.chaosInterval - (window.gameState.gameTimeMs - window.gameState.lastChaosTime));
            window.gameState.chaosTimerDisplay.textContent = `Next Chaos: ${Math.ceil(timeToNextChaos / 1000)}s`;
            window.gameState.chaosTimerDisplay.style.color = '';
            window.gameState.chaosAlert.style.display = 'none';
            // Remove visual effect from canvas
            window.gameState.canvas.classList.remove('chaos-flash');
        }
    }

    // Update shop screen if visible
    // Note: shopScreen and shopCoinsDisplay are global variables managed by ui-handlers.js,
    // so we access them directly from the window object here.
    if (window.shopScreen && window.shopScreen.style.display === 'flex' && window.shopCoinsDisplay) {
        window.shopCoinsDisplay.textContent = window.gameState.totalCoins;
    }
};