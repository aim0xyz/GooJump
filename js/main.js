// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // Initial setup calls
    // These calls ensure the DOM and canvas context are fully loaded and assigned
    // by game-logic.js's DOMContentLoaded block before game elements are created or drawn.

    if (window.gameState.canvas && window.gameState.ctx) {
        // Initialize platforms and draw the initial state before any game starts
        window.createPlatforms();
        window.drawGame(); // Corrected from window.draw() to window.drawGame()
    } else {
        console.error("Canvas or context not initialized properly. Game setup aborted.");
    }

    // The Firebase auth state listener in data-management.js will then
    // automatically handle showing the correct initial screen (login/register or game menu).
});