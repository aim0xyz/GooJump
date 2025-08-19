// js/game-state.js

// Central game state object
window.gameState = {
    // Canvas and Context
    canvas: document.getElementById("gameCanvas"),
    ctx: document.getElementById("gameCanvas").getContext("2d"),

    // UI Elements
    scoreDisplay: document.getElementById("score"),
    coinsDisplay: document.getElementById("coinsDisplay"),
    heartsDisplay: document.getElementById("heartsDisplay"),
    chaosTimerDisplay: document.getElementById("chaosTimer"),
    chaosAlert: document.getElementById("chaosAlert"),

    // Touch Zones
    leftZone: document.getElementById("leftZone"),
    rightZone: document.getElementById("rightZone"),

    // Game Control Flags
    gameRunning: false,
    worldOffsetY: 0,
    gameTimeMs: 0,
    lastChaosTime: 0,
    chaosInterval: 10000, // 10 seconds

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

    // CHAOS MODES
    currentChaos: "normal",
    chaosModes: [
        "normal",
        "gravity_flip",
        "reverse_controls",
        "super_speed",
        "slippery",
        "tiny_platforms",
        "bouncy",
        "slow_motion"
    ],

    // Shop items
    shopItems: {
        heart: { cost: 50, name: "Heart (1 Revive)" }
    },

    // Player Object
    player: {
        x: 170, y: 440,
        width: 60, height: 60,
        dx: 0, dy: 0,

        baseSpeed: 0.9,
        baseMaxSpeed: 6,
        baseFriction: 0.86,
        baseGravity: 0.42,
        baseJumpPower: -10.5,

        speed: 0.9,
        maxSpeed: 6,
        friction: 0.86,
        gravity: 0.42,
        jumpPower: -10.5,

        bodyColor: "#9D4EDD",
        eyeLeft: "#FFD166",
        eyeRight: "#457B9D",

        squishT: 0
    },

    // Constants
    coinSize: 16,
    coinValue: 1,
    coinChance: 0.2,

    // Firebase Data Reference
    currentUserDataRef: null,
};

// Expose updateUI function globally for game logic and UI handlers
window.updateUI = function() {
    window.gameState.scoreDisplay.textContent = `${window.heightMeters()}m`;
    window.gameState.coinsDisplay.textContent = `🟡 ${window.gameState.currentRoundCoins}`;
    window.gameState.heartsDisplay.textContent = `❤️ ${window.gameState.hearts}`;
    // Shop coins display is handled separately in ui-handlers
};

window.heightMeters = function() {
    return Math.max(0, Math.floor(window.gameState.worldOffsetY / 5));
};

window.getPlatformWidth = function() {
    return window.gameState.currentChaos === "tiny_platforms" ? 60 : 100;
};