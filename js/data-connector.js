/**
 * Data Connector Script
 * Handles integration with Firebase and loading of reports/markers
 */

(function() {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Data Connector] Initializing data connector');
        
        // Initialize login event handler
        initializeFirebaseAuth();
        
        // Initialize data loading
        initializeDataLoading();
    });
    
    // Initialize Firebase Auth and login handlers
    function initializeFirebaseAuth() {
        // Check if Firebase auth is available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            console.log('[Data Connector] Setting up Firebase auth');
            
            // Set up auth state change listener
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    // User is signed in
                    console.log('[Data Connector] User is signed in:', user.displayName || user.email);
                    
                    // Update user display name
                    updateUserDisplay(user);
                    
                    // Load user-specific data
                    loadUserData(user);
                } else {
                    // User is signed out, check if there's a login button and set up handler
                    setupLoginHandler();
                }
            });
            
            // Set up logout handler
            setupLogoutHandler();
        } else {
            console.warn('[Data Connector] Firebase auth not available');
            
            // Try to find login button anyway
            setupLoginHandler();
        }
    }
    
    // Update user display
    function updateUserDisplay(user) {
        // Update user display name
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.textContent = user.displayName || user.email.split('@')[0];
        }
        
        // Show user menu
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.style.display = 'flex';
        }
    }
    
    // Load user-specific data
    function loadUserData(user) {
        if (typeof firebase !== 'undefined' && firebase.database) {
            // Load user's report count
            firebase.database().ref('users/' + user.uid + '/reportCount').once('value')
                .then(function(snapshot) {
                    if (snapshot.exists()) {
                        const count = snapshot.val();
                        
                        // Update report counter
                        const countElement = document.getElementById('reportCountValue');
                        if (countElement) {
                            countElement.textContent = count.toString();
                        }
                        
                        // Also update localStorage
                        localStorage.setItem('reportCount', count.toString());
                    }
                })
                .catch(function(error) {
                    console.error('[Data Connector] Error loading user report count:', error);
                });
        }
    }
    
    // Set up login handler
    function setupLoginHandler() {
        // Find login button
        const loginBtn = document.querySelector('.login-btn, #loginBtn, [data-action="login"]');
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Check if we should redirect to login page
                if (loginBtn.getAttribute('href') && loginBtn.getAttribute('href') !== '#') {
                    window.location.href = loginBtn.getAttribute('href');
                    return;
                }
                
                // Otherwise try to open Firebase auth UI
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    // Check if there's a login provider preference
                    const provider = loginBtn.getAttribute('data-provider') || 'google';
                    
                    let authProvider;
                    if (provider === 'google') {
                        authProvider = new firebase.auth.GoogleAuthProvider();
                    } else if (provider === 'facebook') {
                        authProvider = new firebase.auth.FacebookAuthProvider();
                    } else if (provider === 'twitter') {
                        authProvider = new firebase.auth.TwitterAuthProvider();
                    } else if (provider === 'github') {
                        authProvider = new firebase.auth.GithubAuthProvider();
                    } else {
                        // Default to Google
                        authProvider = new firebase.auth.GoogleAuthProvider();
                    }
                    
                    // Sign in with popup
                    firebase.auth().signInWithPopup(authProvider)
                        .then(function(result) {
                            console.log('[Data Connector] User signed in:', result.user.displayName);
                        })
                        .catch(function(error) {
                            console.error('[Data Connector] Auth error:', error);
                            alert(error.message);
                        });
                }
            });
        }
    }
    
    // Set up logout handler
    function setupLogoutHandler() {
        // Find logout button
        const logoutBtn = document.querySelector('.logout-btn, #logoutBtn, #logoutMenuItem, [data-action="logout"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (typeof firebase !== 'undefined' && firebase.auth) {
                    firebase.auth().signOut()
                        .then(function() {
                            console.log('[Data Connector] User signed out');
                            
                            // Hide user menu
                            const userMenu = document.getElementById('userMenu');
                            if (userMenu) {
                                userMenu.style.display = 'none';
                            }
                            
                            // Reload page to refresh state
                            window.location.reload();
                        })
                        .catch(function(error) {
                            console.error('[Data Connector] Sign out error:', error);
                        });
                }
            });
        }
    }
    
    // Initialize data loading
    function initializeDataLoading() {
        // Wait for map to be ready
        waitForMap(function() {
            // Load markers from Firebase
            loadMarkersFromFirebase();
            
            // Set up real-time updates for new reports
            setupRealtimeUpdates();
        });
    }
    
    // Wait for map to be ready
    function waitForMap(callback) {
        const checkMap = function() {
            if (window.map) {
                callback();
            } else {
                setTimeout(checkMap, 500);
            }
        };
        
        checkMap();
    }
    
    // Load markers from Firebase
    function loadMarkersFromFirebase() {
        if (typeof firebase !== 'undefined' && firebase.database) {
            firebase.database().ref('reports').orderByChild('timestamp').limitToLast(100).once('value')
                .then(function(snapshot) {
                    if (snapshot.exists()) {
                        snapshot.forEach(function(childSnapshot) {
                            const report = childSnapshot.val();
                            
                            // Add marker to map if it has location
                            if (report.location && report.location.lat && report.location.lng && report.description) {
                                if (window.UIController && window.UIController.addReportMarker) {
                                    window.UIController.addReportMarker(
                                        report.location,
                                        report.description
                                    );
                                }
                            }
                        });
                        
                        // Save markers to localStorage for offline use
                        if (window.UIController && window.UIController.saveMarkersToStorage) {
                            window.UIController.saveMarkersToStorage();
                        }
                    } else {
                        console.log('[Data Connector] No reports found in Firebase');
                        
                        // Load from localStorage as fallback
                        loadFromLocalStorage();
                    }
                })
                .catch(function(error) {
                    console.error('[Data Connector] Error loading reports from Firebase:', error);
                    
                    // Load from localStorage as fallback
                    loadFromLocalStorage();
                });
        } else {
            console.warn('[Data Connector] Firebase database not available');
            
            // Load from localStorage as fallback
            loadFromLocalStorage();
        }
    }
    
    // Load from localStorage
    function loadFromLocalStorage() {
        if (window.UIController && window.UIController.loadExistingMarkers) {
            window.UIController.loadExistingMarkers();
        }
    }
    
    // Set up real-time updates for new reports
    function setupRealtimeUpdates() {
        if (typeof firebase !== 'undefined' && firebase.database) {
            const reportsRef = firebase.database().ref('reports');
            
            // Listen for new reports
            reportsRef.orderByChild('timestamp').startAt(Date.now()).on('child_added', function(snapshot) {
                const report = snapshot.val();
                
                // Add marker for new report
                if (report.location && report.location.lat && report.location.lng && report.description) {
                    if (window.UIController && window.UIController.addReportMarker) {
                        window.UIController.addReportMarker(
                            report.location,
                            report.description
                        );
                    }
                    
                    // Save markers to localStorage
                    if (window.UIController && window.UIController.saveMarkersToStorage) {
                        window.UIController.saveMarkersToStorage();
                    }
                    
                    // Show notification if not from current user
                    if (typeof firebase.auth === 'function' && 
                        firebase.auth().currentUser && 
                        report.user !== firebase.auth().currentUser.uid) {
                        showNewReportNotification(report);
                    }
                }
            });
        }
    }
    
    // Show notification for new report
    function showNewReportNotification(report) {
        // Create notification wrapper if not exists
        let notificationWrapper = document.getElementById('notificationWrapper');
        if (!notificationWrapper) {
            notificationWrapper = document.createElement('div');
            notificationWrapper.id = 'notificationWrapper';
            notificationWrapper.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 300px;
                z-index: 2000;
            `;
            document.body.appendChild(notificationWrapper);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'report-notification';
        notification.style.cssText = `
            background-color: rgba(0, 113, 227, 0.95);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            animation: notification-slide-in 0.3s ease-out;
            cursor: pointer;
        `;
        
        // Add animation style if not exists
        if (!document.getElementById('notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes notification-slide-in {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes notification-slide-out {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create notification content
        const title = document.createElement('div');
        title.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
        title.textContent = window.currentLang === 'zh' ? '新报告已添加' : 'New Report Added';
        
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size: 14px; word-break: break-word;';
        desc.textContent = report.description.length > 50 ? 
            report.description.substring(0, 50) + '...' : report.description;
        
        // Add content to notification
        notification.appendChild(title);
        notification.appendChild(desc);
        
        // Add click handler to center map on report location
        notification.addEventListener('click', function() {
            if (window.map && report.location) {
                window.map.setCenter(report.location);
                window.map.setZoom(15);
                
                // Remove notification
                notification.style.animation = 'notification-slide-out 0.3s ease-out';
                setTimeout(function() {
                    notificationWrapper.removeChild(notification);
                }, 300);
            }
        });
        
        // Add notification to wrapper
        notificationWrapper.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(function() {
            if (notification.parentNode === notificationWrapper) {
                notification.style.animation = 'notification-slide-out 0.3s ease-out';
                setTimeout(function() {
                    if (notification.parentNode === notificationWrapper) {
                        notificationWrapper.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // Expose selected functions to global scope
    window.DataConnector = {
        loadMarkersFromFirebase: loadMarkersFromFirebase,
        loadFromLocalStorage: loadFromLocalStorage
    };
})(); 