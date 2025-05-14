/**
 * UI Controller Script
 * Handles all UI button interactions and events
 */

(function() {
    // 保存全局引用
    let markersToLoad = null;
    
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[UI Controller] Initializing UI event handlers');
        initializeButtonHandlers();
        
        // 延迟加载标记，直到地图初始化
        waitForMapsApi();
    });
    
    // 等待Google Maps API加载
    function waitForMapsApi() {
        try {
            // 尝试从localStorage加载标记数据
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (savedMarkers) {
                markersToLoad = JSON.parse(savedMarkers);
                console.log('[UI Controller] 已保存标记数据，等待地图加载');
            }
            
            // 设置地图加载回调
            window.mapReadyCallbacks = window.mapReadyCallbacks || [];
            window.mapReadyCallbacks.push(function() {
                console.log('[UI Controller] 地图已加载，添加标记');
                if (markersToLoad && markersToLoad.length) {
                    markersToLoad.forEach(function(marker) {
                        addReportMarker(
                            {lat: marker.lat, lng: marker.lng}, 
                            marker.description
                        );
                    });
                }
            });
        } catch (error) {
            console.error('[UI Controller] 加载标记时出错:', error);
        }
    }

    // Initialize all button event handlers
    function initializeButtonHandlers() {
        // Language switch button
        const langSwitchBtn = document.getElementById('langSwitchBtn');
        if (langSwitchBtn) {
            langSwitchBtn.addEventListener('click', function() {
                switchLanguage();
            });
        }

        // Add report button - 修改为先选点后弹窗
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            addReportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // 启动位置选择模式
                startLocationSelection();
            });
        }

        // Quick add button
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // 只弹出描述输入弹窗
                var quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) quickAddForm.style.display = 'block';
            });
        }

        // Form close button
        const formClose = document.getElementById('formClose');
        if (formClose) {
            formClose.addEventListener('click', function() {
                closeReportForm();
            });
        }

        // Submit report button
        const submitReport = document.getElementById('submitReport');
        if (submitReport) {
            submitReport.addEventListener('click', function() {
                submitReportData();
            });
        }

        // Reset location button
        const resetLocationBtn = document.getElementById('resetLocationBtn');
        if (resetLocationBtn) {
            resetLocationBtn.addEventListener('click', function() {
                resetLocationSelection();
            });
        }

        // Cancel report button
        const cancelReport = document.getElementById('cancelReport');
        if (cancelReport) {
            cancelReport.addEventListener('click', function() {
                closeReportForm();
            });
        }

        // Current location button
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', function() {
                useCurrentLocation();
            });
        }

        // Geocode location button
        const geocodeLocationBtn = document.getElementById('geocodeLocationBtn');
        if (geocodeLocationBtn) {
            geocodeLocationBtn.addEventListener('click', function() {
                geocodeFromDescription();
            });
        }
        
        // Quick add form handlers
        const quickAddClose = document.getElementById('quickAddClose');
        if (quickAddClose) {
            quickAddClose.addEventListener('click', function() {
                const quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) quickAddForm.style.display = 'none';
            });
        }
        
        const cancelQuickAdd = document.getElementById('cancelQuickAdd');
        if (cancelQuickAdd) {
            cancelQuickAdd.addEventListener('click', function() {
                const quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) quickAddForm.style.display = 'none';
            });
        }
        
        const submitQuickAdd = document.getElementById('submitQuickAdd');
        if (submitQuickAdd) {
            submitQuickAdd.addEventListener('click', function() {
                submitQuickDescription();
            });
        }

        // User menu handling
        const userDisplayName = document.getElementById('userDisplayName');
        if (userDisplayName) {
            userDisplayName.addEventListener('click', function() {
                toggleUserMenu();
            });
        }

        // Image upload handling
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('imageInput');
        if (imageUploadArea && imageInput) {
            imageUploadArea.addEventListener('click', function() {
                imageInput.click();
            });
            
            imageInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.match('image.*')) {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        const previewImg = document.getElementById('previewImg');
                        const imagePlaceholder = document.getElementById('imagePlaceholder');
                        
                        if (previewImg) previewImg.src = e.target.result;
                        if (previewImg) previewImg.style.display = 'block';
                        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
                    };
                    
                    reader.readAsDataURL(file);
                }
            });
        }

        // Add keyboard shortcut for quick description form
        document.addEventListener('keydown', function(e) {
            const quickAddForm = document.getElementById('quickAddForm');
            if (quickAddForm && quickAddForm.style.display === 'block') {
                // Ctrl+Enter or Cmd+Enter to submit
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    submitQuickDescription();
                }
                
                // Escape to cancel
                if (e.key === 'Escape') {
                    quickAddForm.style.display = 'none';
                }
            }
        });
        
        // 关闭报告计数器弹窗
        const closeCounterPopup = document.getElementById('closeCounterPopup');
        if (closeCounterPopup) {
            closeCounterPopup.addEventListener('click', function() {
                const reportCounterPopup = document.getElementById('reportCounterPopup');
                if (reportCounterPopup) reportCounterPopup.style.display = 'none';
            });
        }

        console.log('[UI Controller] All button handlers initialized');
    }
    
    // 实现正确的submitQuickDescription函数
    function submitQuickDescription() {
        console.log('[UI Controller] 提交快速描述');
        
        const quickDescInput = document.getElementById('quickDescInput');
        if (!quickDescInput) {
            console.error('[UI Controller] Quick description input not found');
            return;
        }
        
        const description = quickDescInput.value;
        
        if (!description) {
            alert(window.currentLang === 'zh' ? '请输入描述' : 'Please enter a description');
            return;
        }
        
        // 使用当前地图中心作为位置
        let location = null;
        
        if (window.map && typeof window.map.getCenter === 'function') {
            const center = window.map.getCenter();
            location = {
                lat: center.lat(),
                lng: center.lng()
            };
        } else {
            // 如果地图还未加载，使用默认位置（墨尔本中心）
            location = window.MELBOURNE_CENTER || { lat: -37.8136, lng: 144.9631 };
        }
        
        // 创建报告数据
        const reportData = {
            description: description,
            location: location,
            timestamp: new Date().toISOString(),
            user: 'anonymous-user'
        };
        
        console.log('[UI Controller] 提交快速报告:', reportData);
        
        // 尝试发送数据到Firebase
        if (typeof firebase !== 'undefined' && firebase.database) {
            try {
                // 保存到Firebase
                const reportRef = firebase.database().ref('reports').push();
                reportRef.set(reportData)
                    .then(function() {
                        console.log('[UI Controller] 快速报告已保存到Firebase');
                        
                        // 显示成功消息
                        const reportCounterPopup = document.getElementById('reportCounterPopup');
                        if (reportCounterPopup) reportCounterPopup.style.display = 'block';
                        
                        // 更新报告计数器
                        updateReportCounter();
                        
                        // 关闭表单
                        const quickAddForm = document.getElementById('quickAddForm');
                        if (quickAddForm) quickAddForm.style.display = 'none';
                        
                        // 重置输入
                        quickDescInput.value = '';
                        
                        // 添加标记到地图
                        if (typeof google !== 'undefined' && google.maps) {
                            addReportMarker(location, description);
                        } else {
                            console.warn('[UI Controller] Google Maps未加载，标记将在地图加载后添加');
                            // 保存到临时数组，等待地图加载
                            if (!window.pendingMarkers) window.pendingMarkers = [];
                            window.pendingMarkers.push({
                                location: location,
                                description: description
                            });
                        }
                        
                        // 保存标记到localStorage
                        saveMarkersToStorage();
                    })
                    .catch(function(error) {
                        console.error('[UI Controller] 保存到Firebase失败:', error);
                        handleSubmitError(reportData, quickAddForm, quickDescInput, location, description);
                    });
            } catch (error) {
                console.error('[UI Controller] Firebase操作失败:', error);
                handleSubmitError(reportData, quickAddForm, quickDescInput, location, description);
            }
        } else {
            // Firebase不可用，使用localStorage
            handleSubmitError(reportData, quickAddForm, quickDescInput, location, description);
        }
    }
    
    // 处理提交错误
    function handleSubmitError(reportData, formElement, inputElement, location, description) {
        // 保存到localStorage
        saveReportToLocalStorage(reportData);
        
        // 显示成功消息并关闭表单
        const reportCounterPopup = document.getElementById('reportCounterPopup');
        if (reportCounterPopup) reportCounterPopup.style.display = 'block';
        
        if (formElement) formElement.style.display = 'none';
        
        // 重置输入
        if (inputElement) inputElement.value = '';
        
        // 如果Google Maps已加载，添加标记
        if (typeof google !== 'undefined' && google.maps) {
            addReportMarker(location, description);
        } else {
            // 保存到临时数组，等待地图加载
            if (!window.pendingMarkers) window.pendingMarkers = [];
            window.pendingMarkers.push({
                location: location,
                description: description
            });
        }
        
        // 保存标记到localStorage
        saveMarkersToStorage();
    }

    // Start location selection on map
    function startLocationSelection() {
        window.isSelectingLocation = true;
        const addReportTip = document.getElementById('addReportTip');
        if (addReportTip) {
            addReportTip.style.display = 'block';
        }
        
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            addReportBtn.textContent = window.currentLang === 'zh' ? '× 取消选点' : '× Cancel Selection';
        }
        
        document.body.style.cursor = 'crosshair';
    }

    // Open report form
    function openReportForm() {
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.style.display = 'block';
            
            // Reset form fields
            document.getElementById('descriptionInput').value = '';
            document.getElementById('previewImg').src = '';
            document.getElementById('previewImg').style.display = 'none';
            document.getElementById('imagePlaceholder').style.display = 'block';
            
            // Cancel location selection mode if active
            cancelLocationSelection();
        }
    }
    
    // Close report form
    function closeReportForm() {
        const reportForm = document.getElementById('reportForm');
        if (reportForm) {
            reportForm.style.display = 'none';
            
            // Remove selection marker if it exists
            if (window.selectionMarker) {
                window.selectionMarker.setMap(null);
                window.selectionMarker = null;
            }
            
            // Cancel location selection mode if active
            cancelLocationSelection();
        }
    }
    
    // Cancel location selection mode
    function cancelLocationSelection() {
        if (window.isSelectingLocation) {
            window.isSelectingLocation = false;
            const addReportTip = document.getElementById('addReportTip');
            if (addReportTip) {
                addReportTip.style.display = 'none';
            }
            
            const addReportBtn = document.getElementById('addReportBtn');
            if (addReportBtn) {
                addReportBtn.textContent = window.currentLang === 'zh' ? 
                    '+ 添加报告' : '+ Add Report';
            }
            
            document.body.style.cursor = 'default';
        }
    }

    // Handle location selection on map
    function selectMapLocation(latLng) {
        window.selectedLocation = {
            lat: latLng.lat(),
            lng: latLng.lng()
        };
        
        // Show marker at the selected location
        if (window.selectionMarker && window.selectionMarker.setMap) {
            window.selectionMarker.setMap(null);
        }
        
        if (typeof google !== 'undefined' && google.maps) {
            window.selectionMarker = new google.maps.Marker({
                position: window.selectedLocation,
                map: window.map,
                zIndex: 1000
            });
        }
        
        // 选点完成后，取消选点模式并打开表单
        cancelLocationSelection();
        openReportForm();
    }

    // Load markers from localStorage or API
    function loadExistingMarkers() {
        console.log('[UI Controller] Loading existing markers');
        
        // Initialize markers array if not exists
        window.markers = window.markers || [];
        
        // Try to load from localStorage first
        try {
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (savedMarkers) {
                const markerData = JSON.parse(savedMarkers);
                
                // Wait until map is loaded
                const loadMarkersWhenMapReady = function() {
                    if (window.map) {
                        markerData.forEach(function(marker) {
                            addReportMarker(
                                {lat: marker.lat, lng: marker.lng}, 
                                marker.description
                            );
                        });
                    } else {
                        // Check again in 500ms
                        setTimeout(loadMarkersWhenMapReady, 500);
                    }
                };
                
                loadMarkersWhenMapReady();
            }
        } catch (error) {
            console.error('[UI Controller] Error loading markers from localStorage:', error);
        }
        
        // Demo: Add some sample markers if none found
        setTimeout(function() {
            if (window.markers.length === 0 && window.map) {
                const center = window.map.getCenter();
                const sampleLocations = [
                    {
                        lat: center.lat() + 0.01,
                        lng: center.lng() + 0.01,
                        desc: '这里有很多人聚集，可能需要关注'
                    },
                    {
                        lat: center.lat() - 0.01,
                        lng: center.lng() - 0.01,
                        desc: '街道需要维修，有大坑'
                    },
                    {
                        lat: center.lat() + 0.005,
                        lng: center.lng() - 0.008,
                        desc: '这个十字路口需要更好的交通信号灯'
                    }
                ];
                
                sampleLocations.forEach(function(loc) {
                    addReportMarker({lat: loc.lat, lng: loc.lng}, loc.desc);
                });
                
                // Save to localStorage
                saveMarkersToStorage();
            }
        }, 2000);
    }
    
    // Save markers to localStorage
    function saveMarkersToStorage() {
        if (!window.markers || window.markers.length === 0) {
            return;
        }
        
        try {
            const markerData = window.markers.map(function(marker) {
                return {
                    lat: marker.getPosition().lat(),
                    lng: marker.getPosition().lng(),
                    description: marker.getTitle() || ''
                };
            });
            
            localStorage.setItem('savedMarkers', JSON.stringify(markerData));
            console.log('[UI Controller] Markers saved to localStorage');
        } catch (error) {
            console.error('[UI Controller] Error saving markers to localStorage:', error);
        }
    }

    // Switch language between Chinese and English
    function switchLanguage() {
        const currentLang = window.currentLang || 'zh';
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        
        window.currentLang = newLang;
        document.getElementById('langSwitchText').textContent = newLang === 'zh' ? 'EN' : '中';
        
        // Update UI text based on selected language
        updateUILanguage(newLang);
        
        console.log(`[UI Controller] Language switched to ${newLang}`);
    }

    // Update all UI text elements based on language
    function updateUILanguage(lang) {
        const translations = {
            'addReportBtn': { zh: '+ 添加报告', en: '+ Add Report' },
            'quickAddBtn': { zh: '+ 直接添加描述', en: '+ Direct Description' },
            'formTitle': { zh: '新报告', en: 'New Report' },
            'photoLabel': { zh: '照片', en: 'Photo' },
            'descLabel': { zh: '描述', en: 'Description' },
            'submitReport': { zh: '确定', en: 'Submit' },
            'resetLocationBtn': { zh: '重新选点', en: 'Reset Location' },
            'cancelReport': { zh: '取消', en: 'Cancel' },
            'geocodeLocationBtn': { zh: '根据描述定位', en: 'Locate from Description' },
            'currentLocationBtn': { zh: '使用当前位置', en: 'Use Current Location' },
            'reportSuccessTitle': { zh: '报告提交成功!', en: 'Report Submitted Successfully!' },
            'pushBtnText': { zh: '启用推送通知', en: 'Enable Push Notifications' },
            'addReportTip': { zh: '点击地图选择位置', en: 'Click on map to select location' }
            // Add more translations as needed
        };

        // Update all translatable elements
        for (const elementId in translations) {
            const element = document.getElementById(elementId);
            if (element && translations[elementId][lang]) {
                element.textContent = translations[elementId][lang];
            }
        }

        // Special handling for push notification button
        const pushBtn = document.getElementById('requestPushPermission');
        if (pushBtn) {
            // Check if notifications are already enabled
            if (pushBtn.classList.contains('active')) {
                pushBtn.textContent = lang === 'zh' ? '已启用推送通知' : 'Push Notifications Enabled';
            } else {
                pushBtn.textContent = lang === 'zh' ? '启用推送通知' : 'Enable Push Notifications';
            }
        }
        
        // Also update placeholders
        const descInput = document.getElementById('descriptionInput');
        if (descInput) {
            descInput.placeholder = lang === 'zh' ? 
                '请描述您看到的情况...' : 'Please describe what you see...';
        }
        
        const imgPlaceholder = document.getElementById('imagePlaceholder');
        if (imgPlaceholder) {
            imgPlaceholder.textContent = lang === 'zh' ? 
                '点击添加照片' : 'Click to add photo';
        }
    }

    // Reset location selection
    function resetLocationSelection() {
        closeReportForm();
        startLocationSelection();
    }

    // Use current device location
    function useCurrentLocation() {
        if (navigator.geolocation) {
            document.getElementById('geocodeStatus').textContent = 
                window.currentLang === 'zh' ? '获取位置中...' : 'Getting location...';
            document.getElementById('geocodeStatus').style.display = 'block';
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    window.selectedLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    // Update marker and center map
                    if (window.map) {
                        window.map.setCenter(window.selectedLocation);
                        
                        if (window.selectionMarker) {
                            window.selectionMarker.setMap(null);
                        }
                        
                        window.selectionMarker = new google.maps.Marker({
                            position: window.selectedLocation,
                            map: window.map,
                            zIndex: 1000
                        });
                    }
                    
                    document.getElementById('geocodeStatus').style.display = 'none';
                },
                function(error) {
                    document.getElementById('geocodeStatus').textContent = 
                        window.currentLang === 'zh' ? 
                        '无法获取位置: ' + getGeolocationErrorMessage(error, 'zh') : 
                        'Could not get location: ' + getGeolocationErrorMessage(error, 'en');
                }
            );
        } else {
            document.getElementById('geocodeStatus').textContent = 
                window.currentLang === 'zh' ? '您的浏览器不支持地理定位' : 'Your browser does not support geolocation';
            document.getElementById('geocodeStatus').style.display = 'block';
        }
    }

    // Get geolocation error message
    function getGeolocationErrorMessage(error, lang) {
        const messages = {
            1: { zh: '位置访问被拒绝', en: 'Permission denied' },
            2: { zh: '位置不可用', en: 'Position unavailable' },
            3: { zh: '请求超时', en: 'Timeout' }
        };
        
        return messages[error.code] ? messages[error.code][lang] : 
               (lang === 'zh' ? '未知错误' : 'Unknown error');
    }

    // Geocode location from description
    function geocodeFromDescription() {
        const description = document.getElementById('descriptionInput').value;
        
        if (!description) {
            document.getElementById('geocodeStatus').textContent = 
                window.currentLang === 'zh' ? '请先输入描述' : 'Please enter a description first';
            document.getElementById('geocodeStatus').style.display = 'block';
            return;
        }
        
        document.getElementById('geocodeStatus').textContent = 
            window.currentLang === 'zh' ? '正在定位...' : 'Locating...';
        document.getElementById('geocodeStatus').style.display = 'block';
        
        // Use Google Geocoding API via Maps Places
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            const geocoder = new google.maps.Geocoder();
            
            // Add Melbourne to improve accuracy
            const searchText = description + ' Melbourne';
            
            geocoder.geocode({ address: searchText }, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK && results[0]) {
                    const location = results[0].geometry.location;
                    
                    window.selectedLocation = {
                        lat: location.lat(),
                        lng: location.lng()
                    };
                    
                    // Update marker and center map
                    if (window.map) {
                        window.map.setCenter(window.selectedLocation);
                        
                        if (window.selectionMarker) {
                            window.selectionMarker.setMap(null);
                        }
                        
                        window.selectionMarker = new google.maps.Marker({
                            position: window.selectedLocation,
                            map: window.map,
                            zIndex: 1000
                        });
                    }
                    
                    document.getElementById('geocodeStatus').textContent = 
                        window.currentLang === 'zh' ? '已找到位置' : 'Location found';
                    
                    // Hide the status after 2 seconds
                    setTimeout(function() {
                        document.getElementById('geocodeStatus').style.display = 'none';
                    }, 2000);
                } else {
                    document.getElementById('geocodeStatus').textContent = 
                        window.currentLang === 'zh' ? '无法根据描述找到位置' : 'Could not find location from description';
                }
            });
        } else {
            document.getElementById('geocodeStatus').textContent = 
                window.currentLang === 'zh' ? '地图API尚未加载' : 'Maps API not loaded';
        }
    }

    // Toggle user menu dropdown
    function toggleUserMenu() {
        const dropdown = document.getElementById('userMenuDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            
            // 隐藏登出按钮
            const logoutMenuItem = document.getElementById('logoutMenuItem');
            if (logoutMenuItem) {
                logoutMenuItem.style.display = 'none';
            }
        }
    }

    // Submit report data
    function submitReportData() {
        const description = document.getElementById('descriptionInput').value;
        
        if (!description) {
            alert(window.currentLang === 'zh' ? '请输入描述' : 'Please enter a description');
            return;
        }
        
        if (!window.selectedLocation) {
            alert(window.currentLang === 'zh' ? '请选择位置' : 'Please select a location');
            return;
        }
        
        // Get the image if available
        const previewImg = document.getElementById('previewImg');
        const imageData = previewImg && previewImg.style.display !== 'none' ? previewImg.src : null;
        
        // Create report data
        const reportData = {
            description: description,
            location: window.selectedLocation,
            image: imageData,
            timestamp: new Date().toISOString(),
            user: 'anonymous-user' // 使用固定的匿名用户ID
        };
        
        console.log('[UI Controller] Submitting report:', reportData);
        
        // Try to send data to Firebase if available
        if (typeof firebase !== 'undefined' && firebase.database) {
            try {
                // Save to Firebase
                const reportRef = firebase.database().ref('reports').push();
                reportRef.set(reportData)
                    .then(function() {
                        console.log('[UI Controller] Report saved to Firebase successfully');
                        
                        // Show success message
                        const reportCounterPopup = document.getElementById('reportCounterPopup');
                        if (reportCounterPopup) reportCounterPopup.style.display = 'block';
                        
                        // Update report counter
                        updateReportCounter();
                        
                        // Close the form
                        closeReportForm();
                        
                        // Add marker to map
                        addReportMarker(window.selectedLocation, description);
                        
                        // Save markers to localStorage
                        saveMarkersToStorage();
                    })
                    .catch(function(error) {
                        console.error('[UI Controller] Error saving to Firebase:', error);
                        
                        // Fallback to localStorage if Firebase fails
                        saveReportToLocalStorage(reportData);
                        
                        // Show success and close form
                        const reportCounterPopup = document.getElementById('reportCounterPopup');
                        if (reportCounterPopup) reportCounterPopup.style.display = 'block';
                        closeReportForm();
                        
                        // Add marker
                        addReportMarker(window.selectedLocation, description);
                        saveMarkersToStorage();
                    });
            } catch (error) {
                console.error('[UI Controller] Error with Firebase:', error);
                
                // Fallback to localStorage
                saveReportToLocalStorage(reportData);
                
                // Show success and close form
                const reportCounterPopup = document.getElementById('reportCounterPopup');
                if (reportCounterPopup) reportCounterPopup.style.display = 'block';
                closeReportForm();
                
                // Add marker
                addReportMarker(window.selectedLocation, description);
                saveMarkersToStorage();
            }
        } else {
            // Firebase not available, use localStorage
            saveReportToLocalStorage(reportData);
            
            // Show success message and close form
            const reportCounterPopup = document.getElementById('reportCounterPopup');
            if (reportCounterPopup) reportCounterPopup.style.display = 'block';
            closeReportForm();
            
            // Add marker
            addReportMarker(window.selectedLocation, description);
            saveMarkersToStorage();
        }
    }
    
    // Save report to localStorage (fallback method)
    function saveReportToLocalStorage(reportData) {
        try {
            // Get existing reports or initialize empty array
            const reports = JSON.parse(localStorage.getItem('reports') || '[]');
            
            // Add new report
            reports.push(reportData);
            
            // Save back to localStorage
            localStorage.setItem('reports', JSON.stringify(reports));
            
            console.log('[UI Controller] Report saved to localStorage successfully');
        } catch (error) {
            console.error('[UI Controller] Error saving to localStorage:', error);
        }
    }
    
    // Update report counter
    function updateReportCounter() {
        try {
            // Get current count from localStorage
            let count = parseInt(localStorage.getItem('reportCount') || '0');
            
            // Increment
            count++;
            
            // Update localStorage
            localStorage.setItem('reportCount', count.toString());
            
            // Update UI
            const countElement = document.getElementById('reportCountValue');
            if (countElement) {
                countElement.textContent = count.toString();
            }
            
            console.log('[UI Controller] Report count updated:', count);
        } catch (error) {
            console.error('[UI Controller] Error updating report count:', error);
        }
    }

    // Add a new marker for a submitted report
    function addReportMarker(location, description) {
        if (!location) {
            console.error('[UI Controller] 无法添加标记，位置为空');
            return;
        }
        
        // 检查Google Maps是否已加载
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('[UI Controller] Google Maps未加载，标记将稍后添加');
            // 保存到临时数组，等待地图加载
            if (!window.pendingMarkers) window.pendingMarkers = [];
            window.pendingMarkers.push({
                location: location,
                description: description
            });
            return;
        }
        
        if (window.map) {
            try {
                const marker = new google.maps.Marker({
                    position: location,
                    map: window.map,
                    animation: google.maps.Animation.DROP,
                    title: description.substring(0, 30) + (description.length > 30 ? '...' : '')
                });
                
                // Store marker in global markers array
                if (!window.markers) {
                    window.markers = [];
                }
                
                window.markers.push(marker);
                
                // Add info window with description
                const infoWindow = new google.maps.InfoWindow({
                    content: '<div style="max-width:200px;">' + description + '</div>'
                });
                
                marker.addListener('click', function() {
                    infoWindow.open(window.map, marker);
                });
            } catch (error) {
                console.error('[UI Controller] 添加标记失败:', error);
            }
        } else {
            console.warn('[UI Controller] 地图未初始化，无法添加标记');
        }
    }

    // Make these functions available globally if needed
    window.UIController = {
        switchLanguage: window.switchLanguage || function() {},
        openReportForm: openReportForm || function() {},
        closeReportForm: closeReportForm || function() {},
        startLocationSelection: startLocationSelection,
        resetLocationSelection: resetLocationSelection || function() {},
        useCurrentLocation: useCurrentLocation || function() {},
        geocodeFromDescription: geocodeFromDescription || function() {},
        submitReportData: submitReportData || function() {},
        submitQuickDescription: submitQuickDescription,
        addReportMarker: addReportMarker,
        saveMarkersToStorage: saveMarkersToStorage || function() {},
        selectMapLocation: selectMapLocation
    };

    function getFirebaseAuth() {
        return window.getFirebaseAuth ? window.getFirebaseAuth() : null;
    }
})();

// Initialize photo upload functionality
document.addEventListener('DOMContentLoaded', function() {
    const imageUpload = document.getElementById('imageUpload');
    const previewImg = document.getElementById('previewImg');
    const imagePlaceholder = document.getElementById('imagePlaceholder');
    
    // Handle file selection for image upload
    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
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
    }
    
    // Add click handler for image placeholder
    if (imagePlaceholder) {
        imagePlaceholder.addEventListener('click', function() {
            imageUpload.click();
        });
    }
    
    // Also allow clicking on the preview img to change photo
    if (previewImg) {
        previewImg.addEventListener('click', function() {
            imageUpload.click();
        });
    }
    
    // Apply CSS fixes to ensure buttons are clickable
    applyCSSFixes();
});

// Apply CSS fixes to ensure all UI elements work correctly
function applyCSSFixes() {
    console.log('[UI Controller] Applying CSS fixes for button clickability');
    
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.innerHTML = `
        /* Ensure buttons have higher z-index and proper pointer events */
        #addReportBtn, #quickAddBtn, #langSwitchBtn, .user-menu, 
        #formClose, #submitReport, #cancelReport, 
        #resetLocationBtn, #currentLocationBtn, #geocodeLocationBtn {
            position: relative;
            z-index: 1000 !important;
            pointer-events: auto !important;
            cursor: pointer !important;
        }
        
        /* Make sure the report form appears above everything else */
        #reportForm {
            z-index: 1001 !important;
            pointer-events: auto !important;
        }
        
        /* Ensure language switcher and user menu are clickable */
        .top-right-container {
            z-index: 1000 !important;
            pointer-events: auto !important;
        }
        
        /* Fix overlay elements that might prevent clicking */
        .report-button-container, .bottom-button-container {
            z-index: 999 !important;
            pointer-events: auto !important;
        }
        
        /* Fix map interactivity */
        #map {
            touch-action: manipulation;
            pointer-events: auto !important;
        }
        
        /* Fix popup z-index */
        #reportCounterPopup {
            z-index: 1500 !important;
        }
        
        /* Fix status display */
        #geocodeStatus {
            z-index: 1200 !important;
        }
        
        /* Fix any overlays that might block clicks */
        #addReportTip {
            z-index: 1100 !important;
            pointer-events: none !important; /* This should not block clicks */
        }
        
        /* Improve button visibility */
        .report-button-container button,
        .bottom-button-container button {
            box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
            transition: transform 0.1s, box-shadow 0.1s !important;
        }
        
        .report-button-container button:active,
        .bottom-button-container button:active {
            transform: translateY(1px) !important;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
        }
    `;
    
    // Add the style element to the head
    document.head.appendChild(styleEl);
    
    // Ensure buttons have proper event listeners by adding touch events for mobile
    const buttons = document.querySelectorAll('button, .button, [role="button"]');
    buttons.forEach(button => {
        // Add touch events to ensure mobile responsiveness
        button.addEventListener('touchstart', function(e) {
            // Prevent default to avoid double-firing with click
            e.preventDefault();
            // Use a custom attribute to track touch starts
            this.setAttribute('data-touch-active', 'true');
        }, {passive: false});
        
        button.addEventListener('touchend', function(e) {
            if (this.getAttribute('data-touch-active') === 'true') {
                // Prevent default to avoid double-firing with click
                e.preventDefault();
                // Remove the tracking attribute
                this.removeAttribute('data-touch-active');
                // Manually trigger the click event
                this.click();
            }
        }, {passive: false});
        
        // Handle touch cancel
        button.addEventListener('touchcancel', function() {
            this.removeAttribute('data-touch-active');
        }, {passive: true});
    });
    
    console.log('[UI Controller] CSS fixes applied');
} 