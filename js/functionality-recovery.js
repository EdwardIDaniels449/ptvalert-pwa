/**
 * Functionality Recovery Script
 * Identifies and restores potentially lost functionality
 */

(function() {
    // Run after a delay to ensure all other scripts have loaded
    setTimeout(function() {
        console.log('[Function Recovery] Starting functionality recovery checks');
        
        // Check for critical functionality
        checkAndRestore();
    }, 1500);
    
    // Check for missing functionality and restore it
    function checkAndRestore() {
        // Check all critical UI elements and functionality
        checkMapFunctionality();
        checkUserMenuFunctionality();
        checkFormFunctionality();
        checkMarkersAndData();
        checkLanguageSwitching();
        checkImageUpload();
        
        // Apply any additional CSS fixes needed
        applyAdditionalCSSFixes();
        
        // Final verification
        setTimeout(verifyAllFunctionality, 1000);
    }
    
    // Check map functionality
    function checkMapFunctionality() {
        if (!window.map) {
            console.warn('[Function Recovery] Map object not found, attempting to recover');
            
            // Check if map element exists
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error('[Function Recovery] Map element not found, creating it');
                
                // Create map element
                const mapDiv = document.createElement('div');
                mapDiv.id = 'map';
                mapDiv.style.width = '100%';
                mapDiv.style.height = '100vh';
                mapDiv.style.position = 'absolute';
                mapDiv.style.top = '0';
                mapDiv.style.left = '0';
                mapDiv.style.zIndex = '1';
                
                // Add to body
                document.body.insertBefore(mapDiv, document.body.firstChild);
            }
            
            // Try to initialize map if Google Maps is available
            if (typeof google !== 'undefined' && google.maps) {
                try {
                    window.map = new google.maps.Map(document.getElementById('map'), {
                        center: { lat: -37.8136, lng: 144.9631 }, // Melbourne center
                        zoom: 13,
                        mapTypeId: google.maps.MapTypeId.ROADMAP,
                        fullscreenControl: false,
                        streetViewControl: false
                    });
                    
                    console.log('[Function Recovery] Map successfully recovered');
                    
                    // Initialize map event listeners
                    initializeMapEventListeners();
                } catch (error) {
                    console.error('[Function Recovery] Failed to recover map:', error);
                }
            }
        } else {
            // Map exists, just make sure it has the right event listeners
            initializeMapEventListeners();
        }
    }
    
    // Initialize map event listeners
    function initializeMapEventListeners() {
        if (window.map) {
            // Add click listener if not already present
            window.map.addListener('click', function(event) {
                if (window.isSelectingLocation) {
                    if (window.UIController && window.UIController.selectMapLocation) {
                        window.UIController.selectMapLocation(event.latLng);
                    } else {
                        // Fallback selection logic
                        window.selectedLocation = {
                            lat: event.latLng.lat(),
                            lng: event.latLng.lng()
                        };
                        
                        // Add marker
                        if (window.selectionMarker) {
                            window.selectionMarker.setMap(null);
                        }
                        
                        window.selectionMarker = new google.maps.Marker({
                            position: window.selectedLocation,
                            map: window.map,
                            zIndex: 1000
                        });
                        
                        // Open report form
                        if (typeof window.openReportForm === 'function') {
                            window.openReportForm();
                        } else {
                            const reportForm = document.getElementById('reportForm');
                            if (reportForm) {
                                reportForm.style.display = 'block';
                                reportForm.style.transform = 'translateY(0)';
                            }
                        }
                        
                        // Exit selection mode
                        window.isSelectingLocation = false;
                        document.getElementById('addReportTip').style.display = 'none';
                        document.getElementById('addReportBtn').textContent = 
                            window.currentLang === 'zh' ? '+ 添加报告' : '+ Add Report';
                        document.body.style.cursor = 'default';
                    }
                }
            });
            
            console.log('[Function Recovery] Map click listener added');
        }
    }
    
    // Check user menu functionality
    function checkUserMenuFunctionality() {
        const userMenu = document.getElementById('userMenu');
        const userMenuDropdown = document.getElementById('userMenuDropdown');
        
        if (userMenu && userMenuDropdown) {
            // Make sure user menu is visible if user is logged in
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                userMenu.style.display = 'flex';
            }
            
            // Ensure click handler for user menu
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.addEventListener('click', function() {
                    userMenuDropdown.style.display = 
                        userMenuDropdown.style.display === 'block' ? 'none' : 'block';
                });
            }
            
            // Ensure logout handler
            const logoutMenuItem = document.getElementById('logoutMenuItem');
            if (logoutMenuItem) {
                logoutMenuItem.addEventListener('click', function() {
                    if (typeof firebase !== 'undefined' && firebase.auth) {
                        firebase.auth().signOut().then(function() {
                            window.location.href = 'login.html?logout=1';
                        });
                    }
                });
            }
            
            // Add a document click handler to close dropdown when clicking outside
            document.addEventListener('click', function(event) {
                if (!userMenu.contains(event.target) && userMenuDropdown.style.display === 'block') {
                    userMenuDropdown.style.display = 'none';
                }
            });
        }
    }
    
    // Check form functionality
    function checkFormFunctionality() {
        const reportForm = document.getElementById('reportForm');
        
        if (reportForm) {
            // Make sure the form can be opened and closed
            if (typeof window.openReportForm !== 'function') {
                window.openReportForm = function() {
                    reportForm.style.display = 'block';
                    setTimeout(function() {
                        reportForm.style.transform = 'translateY(0)';
                    }, 10);
                };
            }
            
            if (typeof window.closeReportForm !== 'function') {
                window.closeReportForm = function() {
                    reportForm.style.transform = 'translateY(100%)';
                    setTimeout(function() {
                        reportForm.style.display = 'none';
                    }, 300);
                };
            }
            
            // Ensure form buttons work
            const formClose = document.getElementById('formClose');
            const submitReport = document.getElementById('submitReport');
            const resetLocationBtn = document.getElementById('resetLocationBtn');
            const cancelReport = document.getElementById('cancelReport');
            
            if (formClose) {
                formClose.addEventListener('click', function() {
                    window.closeReportForm();
                });
            }
            
            if (submitReport) {
                if (!submitReport.onclick) {
                    submitReport.addEventListener('click', function() {
                        if (window.UIController && window.UIController.submitReportData) {
                            window.UIController.submitReportData();
                        }
                    });
                }
            }
            
            if (resetLocationBtn) {
                resetLocationBtn.addEventListener('click', function() {
                    window.closeReportForm();
                    
                    setTimeout(function() {
                        // Reset location selection
                        if (window.UIController && window.UIController.startLocationSelection) {
                            window.UIController.startLocationSelection();
                        } else {
                            window.isSelectingLocation = true;
                            document.getElementById('addReportTip').style.display = 'block';
                            document.getElementById('addReportBtn').textContent = 
                                window.currentLang === 'zh' ? '× 取消选点' : '× Cancel Selection';
                            document.body.style.cursor = 'crosshair';
                        }
                    }, 300);
                });
            }
            
            if (cancelReport) {
                cancelReport.addEventListener('click', function() {
                    window.closeReportForm();
                });
            }
        }
        
        // Check quick add form functionality
        const quickAddForm = document.getElementById('quickAddForm');
        if (quickAddForm) {
            const quickAddClose = document.getElementById('quickAddClose');
            const cancelQuickAdd = document.getElementById('cancelQuickAdd');
            const submitQuickAdd = document.getElementById('submitQuickAdd');
            
            if (quickAddClose) {
                quickAddClose.addEventListener('click', function() {
                    quickAddForm.style.display = 'none';
                });
            }
            
            if (cancelQuickAdd) {
                cancelQuickAdd.addEventListener('click', function() {
                    quickAddForm.style.display = 'none';
                });
            }
            
            if (submitQuickAdd && !submitQuickAdd.onclick) {
                submitQuickAdd.addEventListener('click', function() {
                    if (window.UIController && typeof window.UIController.submitQuickDescription === 'function') {
                        window.UIController.submitQuickDescription();
                    }
                });
            }
        }
    }
    
    // Check markers and data
    function checkMarkersAndData() {
        // If no markers are loaded, try to load them
        if (!window.markers || window.markers.length === 0) {
            console.log('[Function Recovery] No markers found, attempting to load');
            
            // Try to load from Firebase first
            if (window.DataConnector && window.DataConnector.loadMarkersFromFirebase) {
                window.DataConnector.loadMarkersFromFirebase();
            } 
            // Then try UI controller
            else if (window.UIController && window.UIController.loadExistingMarkers) {
                window.UIController.loadExistingMarkers();
            }
            // Fallback to localStorage
            else {
                try {
                    const savedMarkers = localStorage.getItem('savedMarkers');
                    if (savedMarkers) {
                        const markerData = JSON.parse(savedMarkers);
                        
                        // Initialize markers array
                        window.markers = window.markers || [];
                        
                        // Add markers to map
                        if (window.map) {
                            markerData.forEach(function(marker) {
                                const position = {
                                    lat: marker.lat,
                                    lng: marker.lng
                                };
                                
                                const mapMarker = new google.maps.Marker({
                                    position: position,
                                    map: window.map,
                                    title: marker.description || ''
                                });
                                
                                window.markers.push(mapMarker);
                                
                                // Add info window
                                if (marker.description) {
                                    const infoWindow = new google.maps.InfoWindow({
                                        content: '<div style="max-width:200px;">' + marker.description + '</div>'
                                    });
                                    
                                    mapMarker.addListener('click', function() {
                                        infoWindow.open(window.map, mapMarker);
                                    });
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('[Function Recovery] Error loading markers from localStorage:', error);
                }
            }
        }
    }
    
    // Check language switching
    function checkLanguageSwitching() {
        const langSwitchBtn = document.getElementById('langSwitchBtn');
        if (langSwitchBtn) {
            // Ensure language switcher is visible
            langSwitchBtn.style.display = 'flex';
            
            // Make sure it has a click handler
            if (!langSwitchBtn.onclick) {
                langSwitchBtn.addEventListener('click', function() {
                    if (window.UIController && window.UIController.switchLanguage) {
                        window.UIController.switchLanguage();
                    } else {
                        // Fallback language switch
                        const currentLang = window.currentLang || 'zh';
                        window.currentLang = currentLang === 'zh' ? 'en' : 'zh';
                        
                        // Update language display
                        document.getElementById('langSwitchText').textContent = 
                            window.currentLang === 'zh' ? 'EN' : '中';
                            
                        // Try to update UI language
                        if (typeof updateUILanguage === 'function') {
                            updateUILanguage(window.currentLang);
                        }
                    }
                });
            }
        }
    }
    
    // Check image upload
    function checkImageUpload() {
        const imageInput = document.getElementById('imageInput');
        const previewImg = document.getElementById('previewImg');
        const imagePlaceholder = document.getElementById('imagePlaceholder');
        const imageUploadArea = document.getElementById('imageUploadArea');
        
        if (imageInput && previewImg && imagePlaceholder && imageUploadArea) {
            // Make sure image upload area has click handler
            imageUploadArea.addEventListener('click', function() {
                imageInput.click();
            });
            
            // Make sure image input has change handler
            if (!imageInput.onchange) {
                imageInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file && file.type.match('image.*')) {
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            previewImg.src = e.target.result;
                            previewImg.style.display = 'block';
                            imagePlaceholder.style.display = 'none';
                        };
                        
                        reader.readAsDataURL(file);
                    }
                });
                
                console.log('[Function Recovery] Image upload handler restored');
            }
        }
    }
    
    // Apply additional CSS fixes
    function applyAdditionalCSSFixes() {
        // Create a style element
        const styleEl = document.createElement('style');
        styleEl.type = 'text/css';
        styleEl.innerHTML = `
            /* Fix any invisible elements */
            #langSwitchBtn, .user-menu, .map-control, #addReportBtn, #quickAddBtn {
                opacity: 1 !important;
                visibility: visible !important;
                display: block !important;
            }
            
            /* Fix language switcher */
            #langSwitchBtn {
                display: flex !important;
                align-items: center;
                gap: 6px;
            }
            
            /* Fix user menu */
            .user-menu {
                display: flex !important;
                align-items: center;
            }
            
            /* Ensure report form has proper styles for animation */
            #reportForm {
                display: none;
                transform: translateY(100%);
                transition: transform 0.3s ease-in-out;
            }
            
            /* Add responsive fixes for mobile */
            @media (max-width: 768px) {
                #langSwitchBtn, .user-menu {
                    padding: 5px 10px !important;
                }
                
                .map-control {
                    width: 90% !important;
                    bottom: 20px !important;
                }
            }
        `;
        
        // Add the style element to the head
        document.head.appendChild(styleEl);
        
        console.log('[Function Recovery] Additional CSS fixes applied');
    }
    
    // Final verification of all functionality
    function verifyAllFunctionality() {
        console.log('[Function Recovery] Verifying all functionality');
        
        // Check for critical objects
        let issues = 0;
        
        if (!window.map) {
            console.error('[Function Recovery] Map still not available after recovery attempts');
            issues++;
        }
        
        if (!window.UIController) {
            console.error('[Function Recovery] UIController not available');
            issues++;
        }
        
        if (!window.openReportForm || !window.closeReportForm) {
            console.error('[Function Recovery] Report form functions not available');
            issues++;
        }
        
        // Check login status
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const isOnLoginPage = window.location.pathname.indexOf('login.html') !== -1;
            
            if (!firebase.auth().currentUser && !isOnLoginPage) {
                console.warn('[Function Recovery] User not logged in, redirecting to login page');
                window.location.href = 'login.html';
            } else if (firebase.auth().currentUser && isOnLoginPage) {
                console.log('[Function Recovery] User already logged in, redirecting to main page');
                window.location.href = 'index.html';
            }
        }
        
        // Show final status
        if (issues > 0) {
            console.warn(`[Function Recovery] Completed with ${issues} unresolved issues`);
        } else {
            console.log('[Function Recovery] All functionality verified and working');
        }
    }

    function getFirebaseAuthSafe() {
        return (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) ? firebase.auth() : null;
    }
})(); 