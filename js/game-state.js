// js/game-state.js

// Central game state object - Initialize properties, defer DOM element assignments
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

    // Input State
    inputLeft: false,
    inputRight: false,

    // CHAOS MODE CONFIGURATION (moved from game-logic.js for centralization)
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
        heart: { cost: 50, name: "Heart" } // Adjusted name as it's defined in shopScreen
    },

    // Player Object
    player: {
        x: 0, y: 0, // Initial positions will be set in startGame()
        dx: 0, dy: 0,
        width: 40, height: 40, // Changed to match game-logic's player dimensions for consistency
        bodyColor: '#36D96D', // Green for normal
        eyeLeft: {x: 10, y: 10, radius: 5, pupilX: 12, pupilY: 12},
        eyeRight: {x: 30, y: 10, radius: 5, pupilX: 28, pupilY: 12},
        jumpPower: -10, // Base jump power
        maxSpeedX: 5, // Base max horizontal speed
        gravity: 0.3, // Base gravity
        squishT: 0, // Squish animation timer
        maxSquish: 0.1 // Max squish amount
    },

    // Platform Constants (moved from game-logic.js)
    platformHeight: 15,
    minPlatformGap: 80,
    maxPlatformGap: 150,
    minPlatformWidth: 60,
    maxPlatformWidth: 120,

    // Coin Constants
    coinRadius: 8, // Changed to match game-logic's coin radius
    coinValue: 1,

    // Firebase Data Reference
    currentUserDataRef: null,
};

// Expose helper functions globally
window.heightMeters = function() {
    // Original game-logic.js uses worldOffsetY / 10, game-state.js had / 5.
    // Stick to one for consistency. Let's use 10px = 1m for smoother numbers.
    return Math.floor(Math.abs(window.gameState.worldOffsetY / 10));
};

window.getPlatformColor = function(type) { // Moved from game-logic.js
    switch (type) {
        case 'normal': return '#333333'; // Dark grey
        case 'spike':  return '#8B0000'; // Dark red
        case 'bouncy': return '#00BFFF'; // Deep sky blue
        default:       return '#333333';
    }
};

// No longer defining window.updateUI here to avoid conflict.
// It will be defined in game-logic.js