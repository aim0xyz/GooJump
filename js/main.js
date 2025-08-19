// js/main.js

// Initial setup calls
// This will be executed once the DOM and all scripts are loaded.

// Initialize platforms and draw the initial state before any game starts
window.createPlatforms();
window.draw();

// The Firebase auth state listener in data-management.js will then
// automatically handle showing the correct initial screen (login/register or game menu).