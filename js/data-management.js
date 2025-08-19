// js/data-management.js

// Firebase Auth State Listener
window.auth.onAuthStateChanged(async (user) => {
    const welcomeMessage = document.getElementById("welcomeMessage");
    console.log("onAuthStateChanged fired. Current user:", user ? user.uid : "No user");

    if (user) {
        // User is signed in.
        welcomeMessage.textContent = `Welcome, ${user.email.split('@')[0]}!`;
        window.gameState.currentUserDataRef = window.db.collection('users').doc(user.uid);
        console.log("User logged in, attempting to load user data for UID:", user.uid);
        await window.loadUserData(user.uid);
        window.showGameMenuScreen();
    } else {
        // User is signed out.
        console.log("No user logged in. Resetting currentUserDataRef.");
        window.gameState.currentUserDataRef = null;
        window.showLoginRegisterScreen();
    }
});

// Load user data from Firestore
window.loadUserData = async function(uid) {
    console.log("loadUserData called for UID:", uid);
    if (!uid) {
        console.warn("loadUserData called with null UID.");
        return;
    }
    try {
        const doc = await window.db.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            window.gameState.totalCoins = data.totalCoins || 0;
            window.gameState.hearts = data.hearts || 1;
            window.gameState.maxHeight = data.maxHeight || 0;
            console.log("User data loaded from Firestore:", data);
        } else {
            console.warn("No user data found in Firestore for UID:", uid, ". Creating new default document.");
            // Create a new document for the user if it doesn't exist (e.g., first Google sign-in)
            await window.db.collection('users').doc(uid).set({
                email: window.auth.currentUser.email,
                totalCoins: 0,
                hearts: 1,
                maxHeight: 0
            });
            window.gameState.totalCoins = 0;
            window.gameState.hearts = 1;
            window.gameState.maxHeight = 0;
            console.log("Default user data created in Firestore for UID:", uid);
        }
        window.updateUI(); // Update game UI with loaded data
    } catch (error) {
        console.error("Error loading or creating user data in Firestore:", error);
        alert("Error loading your game data: " + error.message);
    }
};

// Save user data to Firestore
window.saveUserData = async function() {
    if (!window.gameState.currentUserDataRef) {
        console.warn("saveUserData called but no user is logged in (currentUserDataRef is null). Data not saved.");
        return;
    }
    const currentMaxHeight = window.heightMeters();
    const newMaxHeight = Math.max(window.gameState.maxHeight, currentMaxHeight);

    console.log(`Saving user data. Coins: ${window.gameState.totalCoins}, Hearts: ${window.gameState.hearts}, Max Height: ${newMaxHeight}`);
    try {
        await window.gameState.currentUserDataRef.update({
            totalCoins: window.gameState.totalCoins,
            hearts: window.gameState.hearts,
            maxHeight: newMaxHeight
        });
        window.gameState.maxHeight = newMaxHeight; // Update local max height to reflect saved value
        console.log("User data saved successfully to Firestore.");
    } catch (error) {
        console.error("Error saving user data to Firestore:", error);
        alert("Error saving your game data: " + error.message);
    }
};

// Load leaderboard data
window.loadLeaderboard = async function() {
    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = ''; // Clear previous list
    console.log("Attempting to load leaderboard data.");
    try {
        const querySnapshot = await window.db.collection('users')
                                          .orderBy('maxHeight', 'desc')
                                          .limit(10)
                                          .get();
        if (querySnapshot.empty) {
            console.log("Leaderboard is empty. No scores found.");
            leaderboardList.innerHTML = '<li>No scores yet. Be the first!</li>';
            return;
        }

        console.log("Leaderboard data received:", querySnapshot.docs.length, "documents.");
        querySnapshot.forEach((doc, index) => {
            const data = doc.data();
            const username = data.email ? data.email.split('@')[0] : 'Unknown Player';
            const score = data.maxHeight || 0;
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${username}</span><span>${score}m</span>`;
            leaderboardList.appendChild(li);
        });
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        leaderboardList.innerHTML = `<li>Error loading leaderboard: ${error.message}</li>`;
    }
};