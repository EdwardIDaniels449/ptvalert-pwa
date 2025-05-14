/**
 * App Connector Script
 * Connects our UI controller with original app functionality
 */

(function() {
    // Store references to original functions
    const originalFunctions = {
        openReportForm: window.openReportForm,
        closeReportForm: window.closeReportForm,
        submitReport: null,  // Will capture this from event handlers
        switchLanguage: null  // Will capture this from event handlers
    };

    // When the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[App Connector] Initializing application connectors');
        
        // Connect UI controller with original app functions
        connectUIWithOriginalApp();
        
        // Fix user menu visibility - 显示匿名用户
        fixUserMenuVisibility();
        
        // Show UI elements that might be hidden
        showUIElements();
    });

    // Connect UI controller with original app functions
    function connectUIWithOriginalApp() {
        // Ensure report form transform works correctly
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            // If the form uses transform for showing/hiding
            const originalOpenReportForm = window.UIController.openReportForm;
            window.UIController.openReportForm = function() {
                if (originalFunctions.openReportForm && typeof originalFunctions.openReportForm === 'function') {
                    // Try to call original function first
                    try {
                        originalFunctions.openReportForm();
                    } catch (e) {
                        console.warn('[App Connector] Could not call original openReportForm', e);
                    }
                }
                
                // Then call our implementation
                originalOpenReportForm();
                
                // Ensure the form is visible with the correct transform
                reportForm.style.transform = 'translateY(0)';
                reportForm.style.display = 'block';
            };
            
            // Same for close
            const originalCloseReportForm = window.UIController.closeReportForm;
            window.UIController.closeReportForm = function() {
                if (originalFunctions.closeReportForm && typeof originalFunctions.closeReportForm === 'function') {
                    // Try to call original function first
                    try {
                        originalFunctions.closeReportForm();
                    } catch (e) {
                        console.warn('[App Connector] Could not call original closeReportForm', e);
                    }
                }
                
                // Apply transform first, then hide after animation
                reportForm.style.transform = 'translateY(100%)';
                
                // Wait for animation to complete before hiding
                setTimeout(function() {
                    originalCloseReportForm();
                }, 300);
            };
        }
        
        // Connect submit report functionality with backend
        const submitReport = document.getElementById('submitReport');
        if (submitReport) {
            // Store original click handlers
            const originalSubmitHandler = submitReport.onclick;
            if (originalSubmitHandler) {
                originalFunctions.submitReport = originalSubmitHandler;
            }
            
            // Replace click handler to include both our functionality and original
            submitReport.onclick = function(event) {
                // Prevent default to handle it ourselves
                event.preventDefault();
                
                // Call our implementation
                window.UIController.submitReportData();
                
                // Then try to call original handler if it exists
                if (originalFunctions.submitReport && typeof originalFunctions.submitReport === 'function') {
                    try {
                        // Call with the original context
                        originalFunctions.submitReport.call(this, event);
                    } catch (e) {
                        console.warn('[App Connector] Could not call original submit handler', e);
                    }
                }
            };
        }
        
        // Connect language switcher
        const langSwitchBtn = document.getElementById('langSwitchBtn');
        if (langSwitchBtn) {
            // Store original click handler
            const originalLangHandler = langSwitchBtn.onclick;
            if (originalLangHandler) {
                originalFunctions.switchLanguage = originalLangHandler;
            }
            
            // Replace click handler
            langSwitchBtn.onclick = function(event) {
                // Prevent default
                event.preventDefault();
                
                // Call our implementation
                window.UIController.switchLanguage();
                
                // Then try to call original handler
                if (originalFunctions.switchLanguage && typeof originalFunctions.switchLanguage === 'function') {
                    try {
                        originalFunctions.switchLanguage.call(this, event);
                    } catch (e) {
                        console.warn('[App Connector] Could not call original language switch handler', e);
                    }
                }
            };
        }
    }

    // Fix user menu visibility - 显示匿名用户
    function fixUserMenuVisibility() {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            // 总是显示用户菜单
            userMenu.style.display = 'flex';
            
            // 更新用户显示名称
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName) {
                userDisplayName.textContent = '匿名用户';
            }
            
            // 移除登出菜单项
            const logoutMenuItem = document.getElementById('logoutMenuItem');
            if (logoutMenuItem) {
                logoutMenuItem.style.display = 'none';
            }
        }
    }

    // Show UI elements that might be hidden
    function showUIElements() {
        // Ensure add report button is visible
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            addReportBtn.style.display = 'block';
        }
        
        // Ensure quick add button is visible
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.style.display = 'block';
        }
        
        // Ensure language switcher is visible
        const langSwitchBtn = document.getElementById('langSwitchBtn');
        if (langSwitchBtn) {
            langSwitchBtn.style.display = 'flex';
        }
    }

    // Apply extra fixes for form display
    function applyExtraFormFixes() {
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            // Add CSS to ensure the form displays correctly
            const styleEl = document.createElement('style');
            styleEl.innerHTML = `
                #reportForm {
                    display: none;
                    transform: translateY(100%);
                    transition: transform 0.3s ease-in-out;
                }
                
                #reportForm.active,
                #reportForm[style*="display: block"] {
                    transform: translateY(0) !important;
                }
            `;
            document.head.appendChild(styleEl);
            
            // Add a function to open form
            window.openReportForm = function() {
                reportForm.style.display = 'block';
                // Allow DOM to update before applying transform
                setTimeout(function() {
                    reportForm.style.transform = 'translateY(0)';
                }, 10);
            };
            
            // Add a function to close form
            window.closeReportForm = function() {
                reportForm.style.transform = 'translateY(100%)';
                // Wait for animation to complete
                setTimeout(function() {
                    reportForm.style.display = 'none';
                }, 300);
            };
        }
    }

    // Call this after a slight delay to ensure all other scripts have run
    setTimeout(function() {
        applyExtraFormFixes();
        
        // Check if anything is still not working and apply final fixes
        if (window.map && (!window.markers || window.markers.length === 0)) {
            // Try to load markers one more time
            if (window.UIController && window.UIController.loadExistingMarkers) {
                window.UIController.loadExistingMarkers();
            }
        }
    }, 1000);

    function getFirebaseAuth() {
        return window.getFirebaseAuth ? window.getFirebaseAuth() : null;
    }
})(); 