// js/data-management.js

// Firebase Auth State Listener
window.auth.onAuthStateChanged(async (user) => {
    const welcomeMessage = document.getElementById("welcomeMessage");
    if (user) {
        // User is signed in.
        welcomeMessage.textContent = `Welcome, ${user.email.split('@')[0]}!`;
        window.gameState.currentUserDataRef = window.db.collection('users').doc(user.uid);
        await window.loadUserData(user.uid);
        window.showGameMenuScreen();
    } else {
        // User is signed out.
        window.gameState.currentUserDataRef = null;
        window.showLoginRegisterScreen();
    }
});

// Load user data from Firestore
window.loadUserData = async function(uid) {
    if (!uid) return;
    try {
        const doc = await window.db.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            window.gameState.totalCoins = data.totalCoins || 0;
            window.gameState.hearts = data.hearts || 1;
            window.gameState.maxHeight = data.maxHeight || 0;
            console.log("User data loaded:", data);
        } else {
            console.log("No user data found for UID:", uid);
            // Create basic data if it doesn't exist (e.g., for new users signing up directly with Google)
            await window.db.collection('users').doc(uid).set({
                email: window.auth.currentUser.email,
                totalCoins: 0,
                hearts: 1,
                maxHeight: 0
            });
            window.gameState.totalCoins = 0;
            window.gameState.hearts = 1;
            window.gameState.maxHeight = 0;
        }
        window.updateUI();
    } catch (error) {
        console.error("Error loading user data:", error);
        alert("Error loading your game data: " + error.message);
    }
};

// Save user data to Firestore
window.saveUserData = async function() {
    if (!window.gameState.currentUserDataRef) {
        console.warn("No user logged in to save data.");
        return;
    }
    try {
        await window.gameState.currentUserDataRef.update({
            totalCoins: window.gameState.totalCoins,
            hearts: window.gameState.hearts,
            maxHeight: Math.max(window.gameState.maxHeight, window.heightMeters()) // Update max height if current is greater
        });
        window.gameState.maxHeight = Math.max(window.gameState.maxHeight, window.heightMeters()); // Update local max height
        console.log("User data saved successfully.");
    } catch (error) {
        console.error("Error saving user data:", error);
        alert("Error saving your game data: " + error.message);
    }
};

// Load leaderboard data
window.loadLeaderboard = async function() {
    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = ''; // Clear previous list
    try {
        const querySnapshot = await window.db.collection('users')
                                          .orderBy('maxHeight', 'desc')
                                          .limit(10)
                                          .get();
        if (querySnapshot.empty) {
            leaderboardList.innerHTML = '<li>No scores yet. Be the first!</li>';
            return;
        }

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