/**
 * Data Connector Script
 * Handles integration with Firebase and loading of reports/markers
 */

(function() {
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Data Connector] Initializing data connector');
        
        // 更新UI显示匿名用户
        updateUserDisplay({
            displayName: '匿名用户',
            email: 'anonymous@example.com'
        });
        
        // Initialize data loading
        initializeDataLoading();
    });
    
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
                                        report.description,
                                        childSnapshot.key
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
                            report.description,
                            snapshot.key
                        );
                    }
                    
                    // Save markers to localStorage
                    if (window.UIController && window.UIController.saveMarkersToStorage) {
                        window.UIController.saveMarkersToStorage();
                    }
                    
                    // Show notification
                    showNewReportNotification(report);
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

    function getFirebaseAuth() {
        return window.getFirebaseAuth ? window.getFirebaseAuth() : null;
    }
})(); 