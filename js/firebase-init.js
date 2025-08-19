// js/firebase-init.js

// Firebase Configuration - REPLACE WITH YOUR OWN!
// This is the configuration from your original code. Make sure it's correct.
const firebaseConfig = {
    apiKey: "AIzaSyBNExyd0akuvuz0TNNb26MtuhlWQVFN0K8",
    authDomain: "goojump-2e9bc.firebaseapp.com",
    projectId: "goojump-2e9bc",
    storageBucket: "goojump-2e9bc.firebasestorage.app",
    messagingSenderId: "323169287474",
    appId: "1:323169287474:web:947d23f00d54c16652ab2b",
    measurementId: "G-LRV5CC7CT6"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase service instances
window.auth = firebase.auth();
window.db = firebase.firestore();
window.googleProvider = new firebase.auth.GoogleAuthProvider();