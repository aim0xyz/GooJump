// js/ui-handlers.js

// Declare variables, assign in DOMContentLoaded
let loginRegisterScreen;
let emailInput;
let passwordInput;
let loginButton;
let registerButton;
let googleSignInButton;
let authMessage;

let gameMenuScreen;
let startButton;
let shopButton;
let leaderboardButton;
let logoutButton;
let welcomeMessage;

let gameOverScreen;
let finalHeightDisplay;
let reviveMessage;
let reviveButton;
let gameOverMenuButton;

let shopScreen;
let shopCoinsDisplay;
let buyHeartButton;
let shopBackButton;

let leaderboardScreen;
let leaderboardBackButton;

// IMPORTANT: Move all document.getElementById calls inside this listener
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI element references in ui-handlers.js.");

    // Assign UI element references here:
    loginRegisterScreen = document.getElementById("loginRegisterScreen");
    emailInput = document.getElementById("emailInput");
    passwordInput = document.getElementById("passwordInput");
    loginButton = document.getElementById("loginButton");
    registerButton = document.getElementById("registerButton");
    googleSignInButton = document.getElementById("googleSignInButton");
    authMessage = document.getElementById("authMessage");

    gameMenuScreen = document.getElementById("gameMenuScreen");
    startButton = document.getElementById("startButton");
    shopButton = document.getElementById("shopButton");
    leaderboardButton = document.getElementById("leaderboardButton");
    logoutButton = document.getElementById("logoutButton");
    welcomeMessage = document.getElementById("welcomeMessage");

    gameOverScreen = document.getElementById("gameOverScreen");
    finalHeightDisplay = document.getElementById("finalHeightDisplay");
    reviveMessage = document.getElementById("reviveMessage");
    reviveButton = document.getElementById("reviveButton");
    gameOverMenuButton = document.getElementById("gameOverMenuButton");

    shopScreen = document.getElementById("shopScreen");
    shopCoinsDisplay = document.getElementById("shopCoinsDisplay");
    buyHeartButton = document.getElementById("buyHeartButton");
    shopBackButton = document.getElementById("shopBackButton");

    leaderboardScreen = document.getElementById("leaderboardScreen");
    leaderboardBackButton = document.getElementById("leaderboardBackButton");

    // All event listeners that rely on these elements should also be inside this DOMContentLoaded
    // For brevity, I'll only show the listeners section for this part.
    // ... (rest of the listeners section from ui-handlers.js should start here) ...

    console.log("UI element references and initial event listeners set up in ui-handlers.js.");
});

// The rest of your functions (hideAllScreens, showLoginRegisterScreen, loginUser, etc.)
// can remain outside the DOMContentLoaded, as long as they only use the variables
// *after* they've been assigned in the DOMContentLoaded block.

// ... rest of ui-handlers.js functions ...

// Get UI elements
const loginRegisterScreen = document.getElementById("loginRegisterScreen");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const registerButton = document.getElementById("registerButton");
const googleSignInButton = document.getElementById("googleSignInButton");
const authMessage = document.getElementById("authMessage");

const gameMenuScreen = document.getElementById("gameMenuScreen");
const startButton = document.getElementById("startButton");
const shopButton = document.getElementById("shopButton");
const leaderboardButton = document.getElementById("leaderboardButton");
const logoutButton = document.getElementById("logoutButton");

const gameOverScreen = document.getElementById("gameOverScreen");
const finalHeightDisplay = document.getElementById("finalHeightDisplay");
const reviveMessage = document.getElementById("reviveMessage");
const reviveButton = document.getElementById("reviveButton");
const gameOverMenuButton = document.getElementById("gameOverMenuButton");

const shopScreen = document.getElementById("shopScreen");
const shopCoinsDisplay = document.getElementById("shopCoinsDisplay");
const buyHeartButton = document.getElementById("buyHeartButton");
const shopBackButton = document.getElementById("shopBackButton");

const leaderboardScreen = document.getElementById("leaderboardScreen");
const leaderboardBackButton = document.getElementById("leaderboardBackButton");

// --- UI Navigation Functions ---
window.hideAllScreens = function() {
    loginRegisterScreen.style.display = "none";
    gameMenuScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    shopScreen.style.display = "none";
    leaderboardScreen.style.display = "none";

    window.gameState.scoreDisplay.style.display = "none";
    window.gameState.coinsDisplay.style.display = "none";
    window.gameState.heartsDisplay.style.display = "none";
    window.gameState.chaosTimerDisplay.style.display = "none";
    window.gameState.chaosAlert.style.display = "none";
    window.gameState.leftZone.style.display = "none";
    window.gameState.rightZone.style.display = "none";
};

window.showLoginRegisterScreen = function(message = "Please login or register to play.") {
    window.hideAllScreens();
    loginRegisterScreen.style.display = "flex";
    authMessage.textContent = message;
    emailInput.value = '';
    passwordInput.value = '';
};

window.showGameMenuScreen = function() {
    window.hideAllScreens();
    gameMenuScreen.style.display = "flex";
    window.updateUI(); // Update coins and hearts displayed on menu
};

window.showShopScreen = function() {
    window.hideAllScreens();
    shopScreen.style.display = "flex";
    shopCoinsDisplay.textContent = window.gameState.totalCoins; // Update shop-specific coin display
};

window.showLeaderboardScreen = async function() {
    window.hideAllScreens();
    leaderboardScreen.style.display = "flex";
    document.getElementById("leaderboardList").innerHTML = '<li>Loading leaderboard...</li>';
    await window.loadLeaderboard();
};

window.showGameUI = function() {
    window.hideAllScreens();
    window.gameState.scoreDisplay.style.display = "block";
    window.gameState.coinsDisplay.style.display = "block";
    window.gameState.heartsDisplay.style.display = "block";
    window.gameState.chaosTimerDisplay.style.display = "block";
    window.gameState.leftZone.style.display = "block";
    window.gameState.rightZone.style.display = "block";
};

// --- Authentication UI Handlers ---
async function registerUser() {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        // Initialize user data in Firestore (handled by data-management.js onAuthStateChanged)
        authMessage.textContent = "Registration successful! Logging in...";
    } catch (error) {
        authMessage.textContent = `Registration failed: ${error.message}`;
        console.error("Registration error:", error);
    }
}

async function loginUser() {
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await window.auth.signInWithEmailAndPassword(email, password);
        authMessage.textContent = "Login successful!";
    } catch (error) {
        authMessage.textContent = `Login failed: ${error.message}`;
        console.error("Login error:", error);
    }
}

async function signInWithGoogle() {
    try {
        await window.auth.signInWithPopup(window.googleProvider);
        // User data creation handled by data-management.js onAuthStateChanged
        authMessage.textContent = "Google Sign-In successful!";
    } catch (error) {
        authMessage.textContent = `Google Sign-In failed: ${error.message}`;
        console.error("Google Sign-In error:", error);
    }
}

async function signOutUser() {
    try {
        await window.auth.signOut();
        authMessage.textContent = "Logged out.";
        // Reset local game state variables (handled by data-management.js onAuthStateChanged)
        window.gameState.totalCoins = 0;
        window.gameState.hearts = 1;
        window.gameState.maxHeight = 0;
        window.gameState.currentRoundCoins = 0;
        window.showLoginRegisterScreen("You have been logged out.");
    } catch (error) {
        console.error("Logout error:", error);
        alert("Error logging out: " + error.message);
    }
}

// --- Game Flow UI Handlers ---
window.startGame = function() {
    if (!window.auth.currentUser) {
        window.showLoginRegisterScreen("Please login to start a game.");
        return;
    }
    window.gameState.gameRunning = true;
    window.gameState.worldOffsetY = 0;
    window.gameState.gameTimeMs = 0;
    window.gameState.lastChaosTime = 0;
    window.gameState.currentRevivesUsed = 0;
    window.gameState.currentRoundCoins = 0;

    window.applyChaosMode("normal");

    window.gameState.player.x = (window.gameState.canvas.width - window.gameState.player.width) / 2;
    window.gameState.player.y = 440;
    window.gameState.player.dx = 0;
    window.gameState.player.dy = 0;
    window.gameState.player.squishT = 0;

    window.gameState.gooSplats.length = 0;
    window.gameState.gameCoins.length = 0;
    window.createPlatforms();

    window.showGameUI();
    window.updateUI();

    requestAnimationFrame(window.gameLoop);
};

window.resumeGame = function() {
    window.gameState.gameRunning = true;
    window.showGameUI();
    window.updateUI();
    window.gameLoop.lastTS = 0; // ensure clean dt after pause
    requestAnimationFrame(window.gameLoop);
};

window.endGame = function() {
    window.gameState.gameRunning = false;

    // Save state for potential revive (same height, same world)
    window.gameState.lastDeathState = {
        player: {
            x: window.gameState.player.x, y: window.gameState.player.y,
            dx: window.gameState.player.dx, dy: window.gameState.player.dy,
            bodyColor: window.gameState.player.bodyColor,
            eyeLeft: window.gameState.player.eyeLeft, eyeRight: window.gameState.player.eyeRight
        },
        worldOffsetY: window.gameState.worldOffsetY,
        platforms: window.gameState.platforms.map(p => ({...p})),
        gameCoins: window.gameState.gameCoins.map(c => ({...c}))
    };

    window.hideAllScreens();
    gameOverScreen.style.display = "flex";
    finalHeightDisplay.textContent = `Max Height: ${window.heightMeters()}m`;

    // Decide revive availability
    if (window.gameState.currentRevivesUsed < window.gameState.maxRevivesPerGame && window.gameState.hearts > 0) {
        reviveButton.disabled = false;
        reviveMessage.textContent = "You can revive this round!";
    } else {
        reviveButton.disabled = true;
        if (window.gameState.currentRevivesUsed >= window.gameState.maxRevivesPerGame) {
            reviveMessage.textContent = "You've used your only revive for this round.";
        } else if (window.gameState.hearts <= 0) {
            reviveMessage.textContent = "Not enough hearts to revive. Visit the shop!";
        } else {
            reviveMessage.textContent = "No revives left for this round.";
        }
    }

    window.gameState.inputLeft = false;
    window.gameState.inputRight = false;
};

window.reviveGame = function() {
    if (!window.gameState.lastDeathState || window.gameState.currentRevivesUsed >= window.gameState.maxRevivesPerGame || window.gameState.hearts <= 0) return;

    // Consume heart and mark revive used
    window.gameState.hearts--;
    window.gameState.currentRevivesUsed++;

    // Restore world (height, platforms, remaining coins)
    window.gameState.worldOffsetY = window.gameState.lastDeathState.worldOffsetY;
    window.gameState.platforms = window.gameState.lastDeathState.platforms.map(p => ({...p}));
    window.gameState.gameCoins = window.gameState.lastDeathState.gameCoins.map(c => ({...c})).filter(c => !c.collected);

    // Safe on-screen respawn at same height:
    const safeY = window.getCameraThreshold();
    window.gameState.player.y = safeY;
    window.gameState.player.dy = window.gameState.player.jumpPower * 0.6;
    window.gameState.player.dx = Math.max(-2, Math.min(2, window.gameState.lastDeathState.player.dx || 0));

    window.gameState.gooSplats.length = 0;
    window.gameState.lastDeathState = null;

    window.resumeGame();
};

window.buyHeart = function() {
    const item = window.gameState.shopItems.heart;
    if (window.gameState.totalCoins >= item.cost) {
        window.gameState.totalCoins -= item.cost;
        window.gameState.hearts++;
        window.updateUI();
        window.saveUserData(); // Save changes to Firebase
        alert(`You bought 1 ${item.name}!`);
        window.showShopScreen(); // Re-render shop screen to update coin display
    } else {
        alert(`Not enough coins! You need ${item.cost - window.gameState.totalCoins} more.`);
    }
};

window.showGameMenuScreenAndTransferCoins = async function() {
    // Only when leaving game to menu do we bank the run coins
    window.gameState.totalCoins += window.gameState.currentRoundCoins;
    window.gameState.currentRoundCoins = 0;
    await window.saveUserData(); // Save updated coins and potentially new high score
    window.updateUI();
    window.showGameMenuScreen();
};

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Auth Buttons
    loginButton.addEventListener('click', loginUser);
    registerButton.addEventListener('click', registerUser);
    googleSignInButton.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOutUser);

    // Game Menu Buttons
    startButton.addEventListener('click', window.startGame);
    startButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.startGame(); });

    shopButton.addEventListener('click', window.showShopScreen);
    shopButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showShopScreen(); });

    leaderboardButton.addEventListener('click', window.showLeaderboardScreen);
    leaderboardButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showLeaderboardScreen(); });

    // Shop Buttons
    buyHeartButton.addEventListener('click', window.buyHeart);
    buyHeartButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.buyHeart(); });

    shopBackButton.addEventListener('click', window.showGameMenuScreen);
    shopBackButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showGameMenuScreen(); });

    // Game Over Buttons
    reviveButton.addEventListener('click', window.reviveGame);
    reviveButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.reviveGame(); });

    gameOverMenuButton.addEventListener('click', window.showGameMenuScreenAndTransferCoins);
    gameOverMenuButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showGameMenuScreenAndTransferCoins(); });

    // Leaderboard Buttons
    leaderboardBackButton.addEventListener('click', window.showGameMenuScreen);
    leaderboardBackButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showGameMenuScreen(); });

    // Game Input
    window.gameState.leftZone.addEventListener('touchstart', (e) => { e.preventDefault(); window.gameState.inputLeft = true; });
    window.gameState.leftZone.addEventListener('touchend',   (e) => { e.preventDefault(); window.gameState.inputLeft = false; });
    window.gameState.rightZone.addEventListener('touchstart',(e) => { e.preventDefault(); window.gameState.inputRight = true; });
    window.gameState.rightZone.addEventListener('touchend',  (e) => { e.preventDefault(); window.gameState.inputRight = false; });

    document.addEventListener('keydown', (e) => {
        if (!window.gameState.gameRunning) return;
        if (e.key === 'ArrowLeft' || e.key === 'a') window.gameState.inputLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd') window.gameState.inputRight = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') window.gameState.inputLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd') window.gameState.inputRight = false;
    });
});