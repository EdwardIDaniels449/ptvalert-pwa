// Admin Helper Script
// This script helps to mark a specific user as admin

// Initialize Firebase if not already initialized
function initFirebaseIfNeeded() {
  if (typeof firebase === 'undefined') {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyA41pAi6PZ7qQ8xrLbTg65Y6pcZBYMpLmY",
      authDomain: "ptvalert-19ea4.firebaseapp.com",
      databaseURL: "https://ptvalert-19ea4-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "ptvalert-19ea4",
      storageBucket: "ptvalert-19ea4.appspot.com",
      messagingSenderId: "590126951854",
      appId: "1:590126951854:web:4cbc14144b0a395dc42c3f"
    };
    
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
  }
  
  return firebase.database();
}

// Set user as admin
function setUserAsAdmin(userId) {
  if (!userId) {
    console.error("Error: User ID is required");
    return Promise.reject(new Error("User ID is required"));
  }
  
  const database = initFirebaseIfNeeded();
  const adminUsersRef = database.ref('adminUsers');
  
  return adminUsersRef.child(userId).set(true)
    .then(() => {
      console.log(`Success: User ${userId} has been set as admin`);
      alert(`User ${userId} has been successfully set as admin!`);
      return true;
    })
    .catch((error) => {
      console.error(`Error setting user as admin: ${error.message}`);
      alert(`Failed to set user as admin: ${error.message}`);
      return Promise.reject(error);
    });
}

// Execute immediately to set the specified user as admin
document.addEventListener('DOMContentLoaded', function() {
  const targetUserId = 'FNfqX2piSaZPOY2yzAwDORoDQNY2';
  setUserAsAdmin(targetUserId);
});

// Also expose the function globally
window.setUserAsAdmin = setUserAsAdmin; 