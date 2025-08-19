// js/ui-handlers.js

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
const welcomeMessage = document.getElementById("welcomeMessage"); // Added this to ui-handlers for direct use

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
    console.log("Hiding all screens...");
    loginRegisterScreen.style.display = "none";
    gameMenuScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    shopScreen.style.display = "none";
    leaderboardScreen.style.display = "none";

    // Also hide game-specific UI elements
    window.gameState.scoreDisplay.style.display = "none";
    window.gameState.coinsDisplay.style.display = "none";
    window.gameState.heartsDisplay.style.display = "none";
    window.gameState.chaosTimerDisplay.style.display = "none";
    window.gameState.chaosAlert.style.display = "none"; // Assuming you have this
    window.gameState.leftZone.style.display = "none";
    window.gameState.rightZone.style.display = "none";
};

window.showLoginRegisterScreen = function(message = "Please login or register to play.") {
    console.log("Showing login/register screen with message:", message);
    window.hideAllScreens();
    loginRegisterScreen.style.display = "flex";
    authMessage.textContent = message;
    emailInput.value = '';
    passwordInput.value = '';
};

window.showGameMenuScreen = function() {
    console.log("Showing game menu screen.");
    window.hideAllScreens();
    gameMenuScreen.style.display = "flex";
    window.updateUI(); // Update coins and hearts displayed on menu
};

window.showShopScreen = function() {
    console.log("Showing shop screen.");
    window.hideAllScreens();
    shopScreen.style.display = "flex";
    shopCoinsDisplay.textContent = window.gameState.totalCoins; // Update shop-specific coin display
};

window.showLeaderboardScreen = async function() {
    console.log("Showing leaderboard screen.");
    window.hideAllScreens();
    leaderboardScreen.style.display = "flex";
    document.getElementById("leaderboardList").innerHTML = '<li>Loading leaderboard...</li>'; // Show loading message
    await window.loadLeaderboard();
};

window.showGameUI = function() {
    console.log("Showing game UI.");
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
    console.log("Attempting registration for email:", email);
    try {
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        console.log("Firebase createUserWithEmailAndPassword successful. User UID:", userCredential.user.uid);
        authMessage.textContent = "Registration successful! Logging in...";
        // Initial user data creation will be handled by onAuthStateChanged in data-management.js
    } catch (error) {
        console.error("Registration error:", error); // Log the actual error
        authMessage.textContent = `Registration failed: ${error.message}`;
    }
}

async function loginUser() {
    const email = emailInput.value;
    const password = passwordInput.value;
    console.log("Attempting login for email:", email);
    try {
        await window.auth.signInWithEmailAndPassword(email, password);
        console.log("Firebase signInWithEmailAndPassword successful.");
        authMessage.textContent = "Login successful!";
        // onAuthStateChanged in data-management.js will handle screen transition
    } catch (error) {
        console.error("Login error:", error); // Log the actual error
        authMessage.textContent = `Login failed: ${error.message}`;
    }
}

async function signInWithGoogle() {
    console.log("Attempting Google Sign-In.");
    try {
        await window.auth.signInWithPopup(window.googleProvider);
        console.log("Google Sign-In successful.");
        authMessage.textContent = "Google Sign-In successful!";
        // User data creation and screen transition handled by onAuthStateChanged
    } catch (error) {
        console.error("Google Sign-In error:", error); // Log the actual error
        authMessage.textContent = `Google Sign-In failed: ${error.message}`;
    }
}

async function signOutUser() {
    console.log("Attempting to sign out user.");
    try {
        await window.auth.signOut();
        console.log("Firebase signOut successful.");
        authMessage.textContent = "Logged out.";
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
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Setting up event listeners.");
    // Auth Buttons
    loginButton.addEventListener('click', loginUser);
    registerButton.addEventListener('click', registerUser);
    googleSignInButton.addEventListener('click', signInWithGoogle);
    logoutButton.addEventListener('click', signOutUser);

    // Game Menu Buttons
    startButton.addEventListener('click', window.startGame);
    startButton.addEventListener('touchstart', (e) => { e.preventDefault(); window.startGame(); }); // Touch event for mobile

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

    // Game Input (Touch and Keyboard)
    window.gameState.leftZone.addEventListener('touchstart', (e) => { e.preventDefault(); window.gameState.inputLeft = true; });
    window.gameState.leftZone.addEventListener('touchend',   (e) => { e.preventDefault(); window.gameState.inputLeft = false; });
    window.gameState.rightZone.addEventListener('touchstart',(e) => { e.preventDefault(); window.gameState.inputRight = true; });
    window.gameState.rightZone.addEventListener('touchend',  (e) => { e.preventDefault(); window.gameState.inputRight = false; });

    document.addEventListener('keydown', (e) => {
        if (!window.gameState.gameRunning) return; // Only process input if game is running
        if (e.key === 'ArrowLeft' || e.key === 'a') window.gameState.inputLeft = true;
        if (e.key === 'ArrowRight' || e.key === 'd') window.gameState.inputRight = true;
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') window.gameState.inputLeft = false;
        if (e.key === 'ArrowRight' || e.key === 'd') window.gameState.inputRight = false;
    });
});