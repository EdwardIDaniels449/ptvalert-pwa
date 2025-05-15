/**
 * UI Controller Script
 * Handles all UI button interactions and events
 */

// 设备检测 - 使用全局isMobile变量
// const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// console.log('[UI Controller] 设备类型:', isMobile ? '移动设备' : '桌面设备');

// 确保全局isMobile可用
const isMobileDevice = typeof window.isMobile !== 'undefined' ? window.isMobile : /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('[UI Controller] 设备类型:', isMobileDevice ? '移动设备' : '桌面设备');

// 性能优化变量
const PERFORMANCE_OPTIONS = {
    // 移动设备上避免频繁DOM操作
    useDebounce: isMobileDevice,
    // 移动设备上延迟非关键操作的时间(ms)
    deferTime: isMobileDevice ? 500 : 0,
    // 事件节流间隔(ms)
    throttleInterval: isMobileDevice ? 300 : 100
};

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

// 定义全局函数以解决引用错误问题
window.submitQuickDescription = function() {
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
    
    // 关闭任何可能已经打开的弹窗
    hideAllPopups();
    
    // 尝试发送数据到Firebase
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            // 保存到Firebase
            const reportRef = firebase.database().ref('reports').push();
            reportRef.set(reportData)
                .then(function() {
                    console.log('[UI Controller] 快速报告已保存到Firebase');
                    
                    // 显示成功消息 - 仅在这里显示一次
                    const reportCounterPopup = document.getElementById('reportCounterPopup');
                    if (reportCounterPopup) reportCounterPopup.style.display = 'block';
                    
                    // 更新报告计数器 - 仅在这里更新一次
                    if (window.UIController && window.UIController.updateReportCounter) {
                        window.UIController.updateReportCounter();
                    } else {
                        updateReportCounter();
                    }
                    
                    // 关闭表单
                    const quickAddForm = document.getElementById('quickAddForm');
                    if (quickAddForm) quickAddForm.style.display = 'none';
                    
                    // 重置输入
                    quickDescInput.value = '';
                    
                    // 添加标记到地图 - 移动设备上延迟处理，避免主线程阻塞
                    if (isMobileDevice) {
                        setTimeout(function() {
                            addMarkerAfterSubmit(location, description);
                        }, PERFORMANCE_OPTIONS.deferTime);
                    } else {
                        addMarkerAfterSubmit(location, description);
                    }
                })
                .catch(function(error) {
                    console.error('[UI Controller] 保存到Firebase失败:', error);
                    handleQuickSubmitErrorNoCount(reportData, quickAddForm, quickDescInput, location, description);
                });
        } catch (error) {
            console.error('[UI Controller] Firebase操作失败:', error);
            handleQuickSubmitErrorNoCount(reportData, quickAddForm, quickDescInput, location, description);
        }
    } else {
        // Firebase不可用，使用localStorage
        handleQuickSubmitErrorNoCount(reportData, quickAddForm, quickDescInput, location, description);
    }
};

// 提取添加标记的逻辑为独立函数，方便延迟处理
function addMarkerAfterSubmit(location, description) {
    // 添加标记到地图
    if (typeof google !== 'undefined' && google.maps) {
        if (window.UIController && window.UIController.addReportMarker) {
            window.UIController.addReportMarker(location, description);
        } else {
            addReportMarker(location, description);
        }
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
    if (window.UIController && window.UIController.saveMarkersToStorage) {
        window.UIController.saveMarkersToStorage();
    } else {
        saveMarkersToStorage();
    }
}

// 修改handleQuickSubmitErrorNoCount函数，确保它能正确添加标记
window.handleQuickSubmitErrorNoCount = function(reportData, formElement, inputElement, location, description) {
    console.log('[UI Controller] 处理快速提交按钮，位置:', location, '描述:', description);
    
    try {
        // 先执行关键操作：添加标记到地图
        if (window.UIController && typeof window.UIController.addReportMarker === 'function') {
            console.log('[UI Controller] 使用UIController添加标记');
            window.UIController.addReportMarker(location, description);
        } else if (typeof addReportMarker === 'function') {
            console.log('[UI Controller] 使用全局函数添加标记');
            addReportMarker(location, description);
        } else {
            console.warn('[UI Controller] 找不到添加标记的函数，将创建pendingMarker');
            // 如果找不到添加标记的函数，则保存到pendingMarkers
            window.pendingMarkers = window.pendingMarkers || [];
            window.pendingMarkers.push({
                location: location,
                description: description
            });
        }
        
        // 保存标记到localStorage
        if (window.UIController && typeof window.UIController.saveMarkersToStorage === 'function') {
            window.UIController.saveMarkersToStorage();
        } else if (typeof saveMarkersToStorage === 'function') {
            saveMarkersToStorage();
        }
        
        // 保存报告到localStorage作为备份
        if (window.UIController && typeof window.UIController.saveReportToLocalStorage === 'function') {
            window.UIController.saveReportToLocalStorage(reportData);
        } else if (typeof saveReportToLocalStorage === 'function') {
            saveReportToLocalStorage(reportData);
        }
        
        // 显示成功消息
        const reportCounterPopup = document.getElementById('reportCounterPopup');
        if (reportCounterPopup) {
            reportCounterPopup.style.display = 'block';
            reportCounterPopup.style.zIndex = '5000'; // 确保在最上层
        }
        
        // 关闭表单
        if (formElement) {
            formElement.style.display = 'none';
        }
        
        // 重置输入
        if (inputElement) {
            inputElement.value = '';
        }
        
        // 更新报告计数
        if (window.UIController && typeof window.UIController.updateReportCounter === 'function') {
            window.UIController.updateReportCounter();
        } else if (typeof updateReportCounter === 'function') {
            updateReportCounter();
        }
        
    } catch (error) {
        console.error('[UI Controller] 快速添加标记时出错:', error);
        alert(window.currentLang === 'zh' ? '添加标记失败，请重试' : 'Failed to add marker, please try again');
    }
};

// 创建全局选点函数
window.startLocationSelection = function() {
    console.log('[UI Controller] 开始位置选择');
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
    
    console.log('[UI Controller] 进入选点模式，等待地图点击');
    
    // 确保地图监听器正常工作
    if (window.map) {
        // 移除任何现有的监听器
        if (window.mapClickListener) {
            console.log('[UI Controller] 移除现有地图点击监听器');
            google.maps.event.removeListener(window.mapClickListener);
            window.mapClickListener = null;
        }
        
        // 添加新的监听器
        if (typeof google !== 'undefined' && google.maps) {
            console.log('[UI Controller] 添加新的地图点击监听器');
            window.mapClickListener = google.maps.event.addListener(window.map, 'click', function(event) {
                console.log('[UI Controller] 地图点击事件触发');
                if (window.isSelectingLocation) {
                    const latLng = event.latLng;
                    console.log('[UI Controller] 选择位置:', latLng.lat(), latLng.lng());
                    selectMapLocation(latLng);
                } else {
                    console.log('[UI Controller] 地图点击，但不在选点模式');
                }
            });
            
            // 直接在地图上添加一个提示，指示用户点击
            const mapCenter = window.map.getCenter();
            if (mapCenter && typeof selectMapLocation === 'function') {
                console.log('[UI Controller] 添加临时中心点标记作为提示');
                const tempMarker = new google.maps.Marker({
                    position: mapCenter,
                    map: window.map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0071e3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>'),
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 20)
                    },
                    animation: google.maps.Animation.BOUNCE,
                    optimized: false,
                    zIndex: 1000
                });
                
                // 3秒后移除临时标记
                setTimeout(function() {
                    tempMarker.setMap(null);
                }, 3000);
            }
        } else {
            console.error('[UI Controller] Google Maps API未加载，无法添加点击监听器');
        }
    } else {
        console.error('[UI Controller] 地图未初始化，无法添加点击监听器');
        alert(window.currentLang === 'zh' ? '地图未加载完成，请稍后再试' : 'Map not loaded, please try again later');
    }
};

// 修改选择地图位置函数，确保正确处理点击事件
window.selectMapLocation = function(latLng) {
    console.log('[UI Controller] 选择地图位置:', latLng.lat(), latLng.lng());
    
    // 存储选择的位置
    window.selectedLocation = {
        lat: latLng.lat(),
        lng: latLng.lng()
    };
    
    // 移除现有的选择标记
    if (window.selectionMarker) {
        window.selectionMarker.setMap(null);
    }
    
    if (window.selectionCircle) {
        window.selectionCircle.setMap(null);
    }
    
    // 添加新的选择标记
    if (typeof google !== 'undefined' && google.maps) {
        // 创建标记
        window.selectionMarker = new google.maps.Marker({
            position: latLng,
            map: window.map,
            animation: google.maps.Animation.DROP,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0071e3" stroke="#ffffff" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'),
                scaledSize: new google.maps.Size(30, 30),
                anchor: new google.maps.Point(15, 15)
            }
        });
        
        // 创建圆形
        window.selectionCircle = new google.maps.Circle({
            strokeColor: '#0071e3',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#0071e3',
            fillOpacity: 0.1,
            map: window.map,
            center: latLng,
            radius: 200
        });
    }
    
    // 退出选点模式
    window.isSelectingLocation = false;
    
    const addReportTip = document.getElementById('addReportTip');
    if (addReportTip) {
        addReportTip.style.display = 'none';
    }
    
    const addReportBtn = document.getElementById('addReportBtn');
    if (addReportBtn) {
        addReportBtn.textContent = window.currentLang === 'zh' ? '+ 添加报告' : '+ Add Report';
    }
    
    document.body.style.cursor = 'default';
    
    // 打开报告表单
    openReportForm();
};

(function() {
    // 保存全局引用
    let markersToLoad = null;
    
    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[UI Controller] Initializing UI event handlers');
        initializeButtonHandlers();
        
        // 延迟加载标记，直到地图初始化
        waitForMapsApi();
        
        // 应用设备特定优化
        applyMobileOptimizations();
    });
    
    // 等待Google Maps API加载
    function waitForMapsApi() {
        try {
            // 确保全局markers数组初始化
            window.markers = window.markers || [];
            
            // 确保初始时不在选点模式
            window.isSelectingLocation = false;
            
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

        // Add report button - 修改为只有点击时才进入选点模式
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            // 检测是否为移动设备
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // 移除现有监听器以防重复
            const newAddReportBtn = addReportBtn.cloneNode(true);
            addReportBtn.parentNode.replaceChild(newAddReportBtn, addReportBtn);
            
            // 添加新的事件监听器，确保在移动设备上也能正常工作
            newAddReportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[UI Controller] 添加报告按钮被点击');
                
                // 如果已经在选点模式，则取消选点
                if (window.isSelectingLocation) {
                    // 取消位置选择模式
                    window.isSelectingLocation = false;
                    
                    const addReportTip = document.getElementById('addReportTip');
                    if (addReportTip) {
                        addReportTip.style.display = 'none';
                    }
                    
                    newAddReportBtn.textContent = window.currentLang === 'zh' ? '+ 添加报告' : '+ Add Report';
                    document.body.style.cursor = 'default';
                } else {
                    // 启动位置选择模式
                    if (typeof window.startLocationSelection === 'function') {
                        window.startLocationSelection();
                    } else {
                        // 备用方法，直接实现选点模式
                        console.log('[UI Controller] 备用方法启动位置选择模式');
                        window.isSelectingLocation = true;
                        
                        const addReportTip = document.getElementById('addReportTip');
                        if (addReportTip) {
                            addReportTip.style.display = 'block';
                        }
                        
                        newAddReportBtn.textContent = window.currentLang === 'zh' ? '× 取消选点' : '× Cancel Selection';
                        document.body.style.cursor = 'crosshair';
                    }
                }
            }, { passive: false }); // 添加 passive: false 以确保在移动设备上事件不被忽略
        }

        // Quick add button
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            // 移除现有监听器以防重复
            const newQuickAddBtn = quickAddBtn.cloneNode(true);
            quickAddBtn.parentNode.replaceChild(newQuickAddBtn, quickAddBtn);
            
            // 添加新的事件监听器
            newQuickAddBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[UI Controller] 快速添加按钮被点击');
                
                // 弹出描述输入弹窗
                var quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) {
                    quickAddForm.style.display = 'block';
                    // 确保在iOS设备上正确显示
                    quickAddForm.style.opacity = '1';
                }
            }, { passive: false }); // 添加 passive: false 以确保在移动设备上事件不被忽略
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
                window.submitQuickDescription();
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
                    window.submitQuickDescription();
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
        try {
            console.log('[UI Controller] 关闭报告表单');
            const reportForm = document.getElementById('reportForm');
            if (reportForm) {
                // 首先把表单滑出屏幕
                reportForm.style.transform = 'translateY(100%)';
                
                // 等待动画完成后隐藏表单
                setTimeout(function() {
                    reportForm.style.display = 'none';
                    // 重置z-index为默认值，避免影响其他元素
                    reportForm.style.zIndex = '2000';
                }, 300);
            }
            
            // 移除选择标记
            if (window.selectionMarker) {
                window.selectionMarker.setMap(null);
                window.selectionMarker = null;
            }
            
            // 移除选择圆圈
            if (window.selectionCircle) {
                window.selectionCircle.setMap(null);
                window.selectionCircle = null;
            }
            
            // 重置表单字段
            const descInput = document.getElementById('descriptionInput');
            if (descInput) {
                descInput.value = '';
            }
            
            const previewImg = document.getElementById('previewImg');
            if (previewImg) {
                previewImg.style.display = 'none';
                previewImg.src = '';
            }
            
            const imagePlaceholder = document.getElementById('imagePlaceholder');
            if (imagePlaceholder) {
                imagePlaceholder.style.display = 'block';
            }
            
            // 取消位置选择模式
            cancelLocationSelection();
            
            // 重置选择位置
            window.selectedLocation = null;
            
            console.log('[UI Controller] 报告表单已关闭并重置');
        } catch (error) {
            console.error('[UI Controller] 关闭报告表单时出错:', error);
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
        try {
            console.log('[UI Controller] 确认键被点击，准备提交报告数据');
            
            const description = document.getElementById('descriptionInput').value;
            
            if (!description) {
                alert(window.currentLang === 'zh' ? '请输入描述' : 'Please enter a description');
                return;
            }
            
            if (!window.selectedLocation) {
                alert(window.currentLang === 'zh' ? '请选择位置' : 'Please select a location');
                return;
            }
            
            // 关闭任何可能已经打开的弹窗
            hideAllPopups();
            
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
            
            console.log('[UI Controller] 提交报告:', reportData);
            
            // 先关闭表单，避免表单覆盖后续操作
            closeReportForm();
            
            // 先添加标记到地图，确保无论Firebase是否成功都能添加标记
            console.log('[UI Controller] 添加标记到地图', window.selectedLocation, description);
            if (window.map && typeof google === 'object' && google.maps) {
                // 直接使用这里的逻辑添加标记，不通过其他函数调用
                try {
                    // 确保markers数组已初始化
                    if (!window.markers) {
                        window.markers = [];
                    }
                    
                    // 创建自定义标记
                    const marker = new google.maps.Marker({
                        position: window.selectedLocation,
                        map: window.map,
                        animation: google.maps.Animation.DROP,
                        title: description,
                        label: {
                            text: '🐶',
                            fontSize: '24px',
                            className: 'marker-label'
                        },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 0,
                        },
                        optimized: false
                    });
                    
                    // 保存标记
                    window.markers.push(marker);
                    
                    // 为标记添加点击事件
                    marker.addListener('click', function() {
                        if (typeof window.showReportDetails === 'function') {
                            const reportData = {
                                id: 'marker-' + Date.now(),
                                location: window.selectedLocation,
                                description: description,
                                time: new Date().toISOString(),
                                image: '',
                                emoji: '🐶'
                            };
                            window.showReportDetails(reportData);
                        } else {
                            // 关闭任何已打开的信息窗口
                            if (window.openedInfoWindow) {
                                window.openedInfoWindow.close();
                            }
                            
                            // 创建信息窗口
                            const content = '<div style="padding: 10px; max-width: 300px;">' +
                                '<div style="font-size: 14px; margin-bottom: 10px;">' + description + '</div>' +
                                '<div style="font-size: 12px; color: #666; margin-top: 5px;">' + 
                                    new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() + 
                                '</div>' +
                            '</div>';
                            
                            const infoWindow = new google.maps.InfoWindow({
                                content: content,
                                maxWidth: 300
                            });
                            
                            infoWindow.open(window.map, marker);
                            window.openedInfoWindow = infoWindow;
                        }
                    });
                    
                    console.log('[UI Controller] 标记已成功添加到地图');
                } catch (mapError) {
                    console.error('[UI Controller] 添加标记到地图时出错:', mapError);
                }
            } else {
                // 如果地图API不可用，则将标记添加到待处理队列
                console.log('[UI Controller] 地图API未加载，添加到待处理队列');
                window.pendingMarkers = window.pendingMarkers || [];
                window.pendingMarkers.push({
                    location: window.selectedLocation,
                    description: description
                });
            }
            
            // 保存标记到localStorage
            saveMarkersToStorage();
            
            // 更新报告计数
            updateReportCounter();
            
            // 显示成功消息 - 确保这是最后执行的步骤
            setTimeout(function() {
                const reportCounterPopup = document.getElementById('reportCounterPopup');
                if (reportCounterPopup) {
                    // 设置为最高层级
                    reportCounterPopup.style.zIndex = '10000';
                    reportCounterPopup.style.display = 'block';
                    // 避免可能的点击穿透
                    document.body.style.pointerEvents = 'none';
                    reportCounterPopup.style.pointerEvents = 'auto';
                    
                    // 为弹窗中的按钮设置正确的z-index
                    const closeBtn = reportCounterPopup.querySelector('button');
                    if (closeBtn) {
                        closeBtn.style.zIndex = '10001';
                        closeBtn.style.position = 'relative';
                    }
                    
                    // 延时自动关闭弹窗
                    setTimeout(function() {
                        reportCounterPopup.style.display = 'none';
                        document.body.style.pointerEvents = 'auto';
                    }, 3000);
                }
                
                // 尝试保存到Firebase（如果可用）
                if (typeof firebase !== 'undefined' && firebase.database) {
                    try {
                        const reportRef = firebase.database().ref('reports').push();
                        reportRef.set(reportData)
                            .then(function() {
                                console.log('[UI Controller] 报告已成功保存到Firebase');
                            })
                            .catch(function(error) {
                                console.error('[UI Controller] 保存到Firebase失败，但标记已添加到地图:', error);
                                saveReportToLocalStorage(reportData); // 备份到本地存储
                            });
                    } catch (error) {
                        console.error('[UI Controller] Firebase操作失败，但标记已添加到地图:', error);
                        saveReportToLocalStorage(reportData); // 备份到本地存储
                    }
                } else {
                    // Firebase不可用，使用localStorage
                    saveReportToLocalStorage(reportData);
                    console.log('[UI Controller] 报告已保存到localStorage');
                }
            }, 100);  // 给前面操作一些时间来完成
        } catch (error) {
            console.error('[UI Controller] 提交报告时出错:', error);
            alert(window.currentLang === 'zh' ? '操作失败，请重试' : 'Operation failed, please try again');
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
        console.log('[UI Controller] 添加报告标记:', location, description);
        
        // 如果描述为空，则不添加标记
        if (!description || typeof description !== 'string' || description.trim() === '') {
            console.warn('[UI Controller] 描述为空，不添加标记');
            return null;
        }
        
        // 如果location无效，则不添加标记
        if (!location || typeof location !== 'object' || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
            console.warn('[UI Controller] 位置无效，不添加标记:', location);
            return null;
        }
        
        // 确保markers数组已初始化
        if (!window.markers) {
            console.log('[UI Controller] 初始化markers数组');
            window.markers = [];
        }
        
        if (window.map) {
            try {
                // 创建自定义标记 - 使用狗的Emoji (🐶)
            const marker = new google.maps.Marker({
                position: location,
                map: window.map,
                animation: google.maps.Animation.DROP,
                    title: description,
                    label: {
                        text: '🐶',
                        fontSize: '24px',
                        className: 'marker-label'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 0,
                    },
                    optimized: false
                });
                
                // 保存标记
            window.markers.push(marker);
            
                // 为标记添加点击事件
                marker.addListener('click', function() {
                    // 如果存在showReportDetails函数，则使用它
                    if (typeof window.showReportDetails === 'function') {
                        const reportData = {
                            id: 'marker-' + Date.now(),
                            location: location,
                            description: description,
                            time: new Date().toISOString(),
                            image: '',
                            emoji: '🐶'
                        };
                        window.showReportDetails(reportData);
                    } else {
                        // 否则，使用InfoWindow显示
                        // 关闭任何已打开的信息窗口
                        if (window.openedInfoWindow) {
                            window.openedInfoWindow.close();
                        }
                        
                        // 直接在地图上显示信息窗口，而不是弹出蓝色窗口
            const infoWindow = new google.maps.InfoWindow({
                            content: createInfoWindowContent(description),
                            maxWidth: 300
            });
            
                infoWindow.open(window.map, marker);
                        
                        // 保存当前打开的信息窗口引用
                        window.openedInfoWindow = infoWindow;
                    }
                });
                
                // 保存标记到localStorage
                saveMarkersToStorage();
                
                return marker;
            } catch (error) {
                console.error('[UI Controller] 添加标记时出错:', error);
            }
        } else {
            console.error('[UI Controller] 地图未初始化，无法添加标记');
        }
    }

    // 创建信息窗口内容
    function createInfoWindowContent(description) {
        let content = '<div style="padding: 10px; max-width: 300px;">';
        
        // 添加描述
        content += `<div style="font-size: 14px; margin-bottom: 10px;">${description}</div>`;
        
        // 添加时间戳
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        const dateStr = now.toLocaleDateString();
        content += `<div style="font-size: 12px; color: #666; margin-top: 5px;">${dateStr} ${timeStr}</div>`;
        
        content += '</div>';
        
        return content;
    }

    // Make these functions available globally if needed
    window.UIController = {
        switchLanguage: window.switchLanguage || function() {},
        openReportForm: openReportForm || function() {},
        closeReportForm: closeReportForm || function() {},
        startLocationSelection: window.startLocationSelection,
        resetLocationSelection: resetLocationSelection || function() {},
        useCurrentLocation: useCurrentLocation || function() {},
        geocodeFromDescription: geocodeFromDescription || function() {},
        submitReportData: submitReportData || function() {},
        submitQuickDescription: window.submitQuickDescription,
        addReportMarker: addReportMarker,
        saveMarkersToStorage: saveMarkersToStorage || function() {},
        selectMapLocation: selectMapLocation,
        updateReportCounter: updateReportCounter || function() {},
        saveReportToLocalStorage: saveReportToLocalStorage || function() {},
        handleQuickSubmitError: window.handleQuickSubmitError
    };

    function getFirebaseAuth() {
        return window.getFirebaseAuth ? window.getFirebaseAuth() : null;
    }

    // 在UI控制器初始化时调用的设备优化
    function applyMobileOptimizations() {
        // 只在移动设备上执行以下操作
        if (!isMobileDevice) return;
        
        console.log('[UI Controller] 应用移动设备优化');
        
        // 添加passive标志到常用事件监听，提高滚动性能
        const passiveOption = {passive: true};
        
        // 全局触摸事件使用passive标志
        document.addEventListener('touchstart', function(){}, passiveOption);
        document.addEventListener('touchmove', function(){}, passiveOption);
        
        // 减少非关键UI元素的重绘频率
        const nonCriticalElements = [
            'reportCounterPopup',
            'langSwitchBtn',
            'quickAddBtn'
        ];
        
        // 为非关键元素应用CSS优化
        nonCriticalElements.forEach(function(id) {
            const element = document.getElementById(id);
            if (element) {
                // 添加硬件加速
                element.style.transform = 'translateZ(0)';
                element.style.backfaceVisibility = 'hidden';
            }
        });
        
        // 移动设备使用节流版本的地图缩放
        if (window.map && typeof google !== 'undefined') {
            try {
                // 替换地图上频繁触发的事件处理程序
                const originalAddListener = window.map.addListener;
                
                window.map.addListener = function(eventName, callback) {
                    if (['zoom_changed', 'center_changed', 'bounds_changed'].includes(eventName)) {
                        // 使用节流版本的回调
                        const throttledCallback = throttle(callback, PERFORMANCE_OPTIONS.throttleInterval);
                        return originalAddListener.call(this, eventName, throttledCallback);
                    }
                    return originalAddListener.call(this, eventName, callback);
                };
            } catch (error) {
                console.warn('[UI Controller] 无法覆盖地图事件处理程序:', error);
            }
        }
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

// 隐藏所有弹窗的辅助函数
function hideAllPopups() {
    // 隐藏报告计数器弹窗
    const reportCounterPopup = document.getElementById('reportCounterPopup');
    if (reportCounterPopup) reportCounterPopup.style.display = 'none';
    
    // 隐藏快速添加表单
    const quickAddForm = document.getElementById('quickAddForm');
    if (quickAddForm) quickAddForm.style.display = 'none';
    
    // 隐藏报告表单
    const reportForm = document.getElementById('reportForm');
    if (reportForm) reportForm.style.display = 'none';
    
    // 隐藏右侧的蓝色弹窗
    const bluePopups = document.querySelectorAll('.report-counter-popup');
    bluePopups.forEach(popup => {
        popup.style.display = 'none';
    });
} 