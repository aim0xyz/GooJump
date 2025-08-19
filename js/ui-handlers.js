// js/ui-handlers.js

// Declare UI element variables globally (using let)
// They will be assigned their actual DOM elements inside DOMContentLoaded
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
let welcomeMessage; // Global for direct access by data-management.js

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


// --- UI Navigation Functions ---
// These functions can remain outside DOMContentLoaded as they use the variables
// which will have been assigned by the time these functions are called.
window.hideAllScreens = function() {
    console.log("Hiding all screens...");
    // Check if the element exists before trying to change its style
    if (loginRegisterScreen) loginRegisterScreen.style.display = "none";
    if (gameMenuScreen) gameMenuScreen.style.display = "none";
    if (gameOverScreen) gameOverScreen.style.display = "none";
    if (shopScreen) shopScreen.style.display = "none";
    if (leaderboardScreen) leaderboardScreen.style.display = "none";

    // Also hide game-specific UI elements (check for existence before access)
    // These are part of window.gameState, so they will be assigned in game-logic.js's DOMContentLoaded
    if (window.gameState.scoreDisplay) window.gameState.scoreDisplay.style.display = "none";
    if (window.gameState.coinsDisplay) window.gameState.coinsDisplay.style.display = "none";
    if (window.gameState.heartsDisplay) window.gameState.heartsDisplay.style.display = "none";
    if (window.gameState.chaosTimerDisplay) window.gameState.chaosTimerDisplay.style.display = "none";
    if (window.gameState.chaosAlert) window.gameState.chaosAlert.style.display = "none";
    if (window.gameState.leftZone) window.gameState.leftZone.style.display = "none";
    if (window.gameState.rightZone) window.gameState.rightZone.style.display = "none";
};

window.showLoginRegisterScreen = function(message = "Please login or register to play.") {
    console.log("Showing login/register screen with message:", message);
    window.hideAllScreens();
    if (loginRegisterScreen) loginRegisterScreen.style.display = "flex";
    if (authMessage) authMessage.textContent = message;
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
};

window.showGameMenuScreen = function() {
    console.log("Showing game menu screen.");
    window.hideAllScreens();
    if (gameMenuScreen) gameMenuScreen.style.display = "flex";
    window.updateUI(); // Update coins and hearts displayed on menu
};

window.showShopScreen = function() {
    console.log("Showing shop screen.");
    window.hideAllScreens();
    if (shopScreen) shopScreen.style.display = "flex";
    if (shopCoinsDisplay) shopCoinsDisplay.textContent = window.gameState.totalCoins; // Update shop-specific coin display
};

window.showLeaderboardScreen = async function() {
    console.log("Showing leaderboard screen.");
    window.hideAllScreens();
    if (leaderboardScreen) leaderboardScreen.style.display = "flex";
    // Ensure leaderboardList element exists before trying to modify it
    const listElement = document.getElementById("leaderboardList");
    if (listElement) listElement.innerHTML = '<li>Loading leaderboard...</li>'; // Show loading message
    await window.loadLeaderboard();
};

window.showGameUI = function() {
    console.log("Showing game UI.");
    window.hideAllScreens();
    // Check for existence before setting style
    if (window.gameState.scoreDisplay) window.gameState.scoreDisplay.style.display = "block";
    if (window.gameState.coinsDisplay) window.gameState.coinsDisplay.style.display = "block";
    if (window.gameState.heartsDisplay) window.gameState.heartsDisplay.style.display = "block";
    if (window.gameState.chaosTimerDisplay) window.gameState.chaosTimerDisplay.style.display = "block";
    if (window.gameState.leftZone) window.gameState.leftZone.style.display = "block";
    if (window.gameState.rightZone) window.gameState.rightZone.style.display = "block";
};

// --- Authentication UI Handlers ---
async function registerUser() {
    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    console.log("Attempting registration for email:", email);
    if (!email || !password) {
        if (authMessage) authMessage.textContent = "Please enter both email and password.";
        return;
    }
    try {
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        console.log("Firebase createUserWithEmailAndPassword successful. User UID:", userCredential.user.uid);
        if (authMessage) authMessage.textContent = "Registration successful! Logging in...";
        // Initial user data creation will be handled by onAuthStateChanged in data-management.js
    } catch (error) {
        console.error("Registration error:", error); // Log the actual error
        if (authMessage) authMessage.textContent = `Registration failed: ${error.message}`;
    }
}

async function loginUser() {
    const email = emailInput ? emailInput.value : '';
    const password = passwordInput ? passwordInput.value : '';
    console.log("Attempting login for email:", email);
    if (!email || !password) {
        if (authMessage) authMessage.textContent = "Please enter both email and password.";
        return;
    }
    try {
        await window.auth.signInWithEmailAndPassword(email, password);
        console.log("Firebase signInWithEmailAndPassword successful.");
        if (authMessage) authMessage.textContent = "Login successful!";
        // onAuthStateChanged in data-management.js will handle screen transition
    } catch (error) {
        console.error("Login error:", error); // Log the actual error
        if (authMessage) authMessage.textContent = `Login failed: ${error.message}`;
    }
}

async function signInWithGoogle() {
    console.log("Attempting Google Sign-In.");
    try {
        await window.auth.signInWithPopup(window.googleProvider);
        console.log("Google Sign-In successful.");
        if (authMessage) authMessage.textContent = "Google Sign-In successful!";
        // User data creation and screen transition handled by onAuthStateChanged
    } catch (error) {
        console.error("Google Sign-In error:", error); // Log the actual error
        if (authMessage) authMessage.textContent = `Google Sign-In failed: ${error.message}`;
    }
}

async function signOutUser() {
    console.log("Attempting to sign out user.");
    try {
        await window.auth.signOut();
        console.log("Firebase signOut successful.");
        if (authMessage) authMessage.textContent = "Logged out.";
        // Reset local game state variables
        window.gameState.totalCoins = 0;
        window.gameState.hearts = 1;
        window.gameState.maxHeight = 0;
        window.gameState.currentRoundCoins = 0;
        window.showLoginRegisterScreen("You have been logged out.");
    } catch (error) {
        console.error("Logout error:", error); // Log the actual error
        alert("Error logging out: " + error.message);
    }
}

// --- Game Flow UI Handlers ---
window.startGame = function() {
    console.log("startGame called.");
    if (!window.auth.currentUser) {
        console.warn("Attempted to start game without being logged in.");
        window.showLoginRegisterScreen("Please login to start a game.");
        return;
    }
    window.gameState.gameRunning = true;
    window.gameState.worldOffsetY = 0;
    window.gameState.gameTimeMs = 0;
    window.gameState.lastChaosTime = 0;
    window.gameState.currentRevivesUsed = 0;
    window.gameState.currentRoundCoins = 0;

    // Apply initial chaos mode (e.g., "normal")
    window.applyChaosMode("normal");

    // Reset player position and velocity
    window.gameState.player.x = (window.gameState.canvas.width - window.gameState.player.width) / 2;
    window.gameState.player.y = 440; // Or whatever your starting Y should be
    window.gameState.player.dx = 0;
    window.gameState.player.dy = 0;
    window.gameState.player.squishT = 0;

    // Clear game elements
    window.gameState.gooSplats.length = 0;
    window.gameState.gameCoins.length = 0;

    // Crucially, create new platforms for the game round
    window.createPlatforms();

    // Show in-game UI and update displays
    window.showGameUI();
    window.updateUI();

    // Start the game loop
    requestAnimationFrame(window.gameLoop);
};

window.resumeGame = function() {
    console.log("resumeGame called.");
    window.gameState.gameRunning = true;
    window.showGameUI();
    window.updateUI();
    window.gameLoop.lastTS = 0; // ensure clean dt after pause
    requestAnimationFrame(window.gameLoop);
};

window.endGame = function() {
    console.log("endGame called.");
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
        platforms: window.gameState.platforms.map(p => ({...p})), // Clone platforms
        gameCoins: window.gameState.gameCoins.map(c => ({...c})) // Clone coins
    };

    window.hideAllScreens();
    if (gameOverScreen) gameOverScreen.style.display = "flex";
    if (finalHeightDisplay) finalHeightDisplay.textContent = `Max Height: ${window.heightMeters()}m`;

    // Decide revive availability
    if (window.gameState.currentRevivesUsed < window.gameState.maxRevivesPerGame && window.gameState.hearts > 0) {
        if (reviveButton) reviveButton.disabled = false;
        if (reviveMessage) reviveMessage.textContent = "You can revive this round!";
    } else {
        if (reviveButton) reviveButton.disabled = true;
        if (reviveMessage) {
            if (window.gameState.currentRevivesUsed >= window.gameState.maxRevivesPerGame) {
                reviveMessage.textContent = "You've used your only revive for this round.";
            } else if (window.gameState.hearts <= 0) {
                reviveMessage.textContent = "Not enough hearts to revive. Visit the shop!";
            } else {
                reviveMessage.textContent = "No revives left for this round.";
            }
        }
    }

    window.gameState.inputLeft = false;
    window.gameState.inputRight = false;
};

window.reviveGame = function() {
    console.log("reviveGame called.");
    if (!window.gameState.lastDeathState || window.gameState.currentRevivesUsed >= window.gameState.maxRevivesPerGame || window.gameState.hearts <= 0) {
        console.warn("Revive conditions not met.");
        return;
    }

    // Consume heart and mark revive used
    window.gameState.hearts--;
    window.gameState.currentRevivesUsed++;

    // Restore world (height, platforms, remaining coins)
    window.gameState.worldOffsetY = window.gameState.lastDeathState.worldOffsetY;
    window.gameState.platforms = window.gameState.lastDeathState.platforms.map(p => ({...p}));
    window.gameState.gameCoins = window.gameState.lastDeathState.gameCoins.map(c => ({...c})).filter(c => !c.collected);

    // Safe on-screen respawn at same height:
    const safeY = window.getCameraThreshold(); // Player spawns just above the camera threshold
    window.gameState.player.y = safeY;
    window.gameState.player.dy = window.gameState.player.jumpPower * 0.6; // Give a small initial jump
    window.gameState.player.dx = Math.max(-2, Math.min(2, window.gameState.lastDeathState.player.dx || 0)); // Retain some horizontal velocity

    window.gameState.gooSplats.length = 0; // Clear splats on revive
    window.gameState.lastDeathState = null; // Clear saved state

    window.resumeGame();
};

window.buyHeart = function() {
    console.log("buyHeart called.");
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
    console.log("showGameMenuScreenAndTransferCoins called.");
    // Only when leaving game to menu do we bank the run coins
    window.gameState.totalCoins += window.gameState.currentRoundCoins;
    window.gameState.currentRoundCoins = 0;
    await window.saveUserData(); // Save updated coins and potentially new high score
    window.updateUI();
    window.showGameMenuScreen();
};

// --- Event Listeners ---
// All event listeners that rely on UI elements must be set up AFTER the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up UI element references and event listeners in ui-handlers.js.");

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


    // Now that elements are assigned, set up event listeners
    // Auth Buttons
    if (loginButton) loginButton.addEventListener('click', loginUser);
    if (registerButton) registerButton.addEventListener('click', registerUser);
    if (googleSignInButton) googleSignInButton.addEventListener('click', signInWithGoogle);
    if (logoutButton) logoutButton.addEventListener('click', signOutUser);

    // Game Menu Buttons
    if (startButton) {
        startButton.addEventListener('click', window.startGame);
        startButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.startGame(); }); // Touch event for mobile
    }
    if (shopButton) {
        shopButton.addEventListener('click', window.showShopScreen);
        shopButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showShopScreen(); });
    }
    if (leaderboardButton) {
        leaderboardButton.addEventListener('click', window.showLeaderboardScreen);
        leaderboardButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showLeaderboardScreen(); });
    }

    // Shop Buttons
    if (buyHeartButton) {
        buyHeartButton.addEventListener('click', window.buyHeart);
        buyHeartButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.buyHeart(); });
    }
    if (shopBackButton) {
        shopBackButton.addEventListener('click', window.showGameMenuScreen);
        shopBackButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showGameMenuScreen(); });
    }

    // Game Over Buttons
    if (reviveButton) {
        reviveButton.addEventListener('click', window.reviveGame);
        reviveButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.reviveGame(); });
    }
    if (gameOverMenuButton) {
        gameOverMenuButton.addEventListener('click', window.showGameMenuScreenAndTransferCoins);
        gameOverMenuButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showGameMenuScreenAndTransferCoins(); });
    }

    // Leaderboard Buttons
    if (leaderboardBackButton) {
        leaderboardBackButton.addEventListener('click', window.showGameMenuScreen);
        leaderboardBackButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.showGameMenuScreen(); });
    }

    // Game Input (Touch and Keyboard)
    // These elements are part of window.gameState, assigned in game-logic.js
    // We can rely on them being assigned if game-logic.js also uses DOMContentLoaded
    if (window.gameState.leftZone) {
        window.gameState.leftZone.addEventListener('touchstart', (e) => { e.preventDefault(); window.gameState.inputLeft = true; });
        window.gameState.leftZone.addEventListener('touchend',   (e) => { e.preventDefault(); window.gameState.inputLeft = false; });
    }
    if (window.gameState.rightZone) {
        window.gameState.rightZone.addEventListener('touchstart',(e) => { e.preventDefault(); window.gameState.inputRight = true; });
        window.gameState.rightZone.addEventListener('touchend',  (e) => { e.preventDefault(); window.gameState.inputRight = false; });
    }


    document.addEventListener('keydown', (e) => {
        if (!window.gameState.gameRunning) return; // Only process input if game is running
        if (e.key === 'ArrowLeft' || e.key === 'a') window.gameState.inputLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd') window.gameState.inputRight = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') window.gameState.inputLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd') window.gameState.inputRight = false;
    });

    console.log("UI element references and event listeners set up in ui-handlers.js.");
});