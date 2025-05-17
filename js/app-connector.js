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
        
        // 检查Google Maps是否已加载
        checkMapsAPILoaded();
        
        // 添加调试信息到页面
        addDebugInfoPanel();
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

    // 检查Google Maps API是否已加载
    function checkMapsAPILoaded() {
        console.log('[App Connector] 检查Google Maps API状态...');
        
        // 使用我们的修复脚本来加载API
        if (typeof document.dispatchEvent === 'function') {
            console.log('[App Connector] 通过修复脚本请求加载API');
            document.dispatchEvent(new CustomEvent('request_google_maps_api'));
        }
        
        // 15秒后检查地图状态
        setTimeout(function() {
            const mapStatus = document.getElementById('mapStatus');
            
            if (!window.google || !window.google.maps) {
                console.log('[App Connector] Google Maps API尚未加载，尝试使用备用密钥');
                
                // 使用我们配置的API密钥
                if (window.GOOGLE_MAPS_API_KEY) {
                    console.log('[App Connector] 使用配置的API密钥:', window.GOOGLE_MAPS_API_KEY);
                    loadMapsAPIWithKey(window.GOOGLE_MAPS_API_KEY);
                } else {
                    console.error('[App Connector] Google Maps API未正确加载');
                    if (mapStatus) {
                        mapStatus.textContent = '地图API加载失败';
                    }
                }
            } else {
                console.log('[App Connector] Google Maps API已加载成功');
                if (mapStatus) {
                    mapStatus.textContent = '地图API已加载';
                }
                
                // 确保事件被触发
                document.dispatchEvent(new CustomEvent('google_maps_loaded'));
            }
        }, 15000);
    }
    
    // 使用指定的密钥加载Maps API
    function loadMapsAPIWithKey(apiKey) {
        console.log('[App Connector] 尝试使用密钥加载Google Maps API:', apiKey);
        
        // 创建脚本元素加载Google Maps API
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=googleMapsInitialized&v=weekly&loading=async`;
        script.async = true;
        
        // 设置回调函数
        window.googleMapsInitialized = function() {
            console.log('[App Connector] Google Maps API 加载成功');
            document.dispatchEvent(new CustomEvent('google_maps_loaded'));
        };
        
        // 添加错误处理
        script.onerror = function() {
            console.error('[App Connector] 无法加载Google Maps API，服务器可能不可用');
            useLocalMapsFallback();
        };
        
        // 添加到文档
        document.head.appendChild(script);
    }
    
    // 使用离线备份
    function useLocalMapsFallback() {
        console.log('[App Connector] 尝试使用离线备份初始化地图...');
        
        // 创建简单的地图对象
        window.map = {
            center: window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631},
            zoom: 13,
            setCenter: function() {},
            setZoom: function() {},
            addListener: function() { return {remove: function() {}}; }
        };
        
        // 显示离线模式提示
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:white;padding:20px;border-radius:10px;text-align:center;"><h3>地图服务暂时不可用</h3><p>请检查网络连接或稍后重试</p></div>';
        }
        
        // 尝试使用本地缓存的标记
        initializeMarkers();
    }
    
    // 初始化标记
    function initializeMarkers() {
        console.log('[App Connector] 初始化标记...');
        
        // 检查地图是否已初始化
        if (!window.map) {
            console.warn('[App Connector] 地图未初始化，无法添加标记');
            return;
        }
        
        // 优先从本地存储加载标记数据
        const loadFromStorage = function() {
            try {
                // 检查是否有标记数据
                const storedMarkers = localStorage.getItem('savedMarkers');
                if (storedMarkers) {
                    try {
                        const markerData = JSON.parse(storedMarkers);
                        console.log(`[App Connector] 从本地存储加载了 ${markerData.length} 个标记`);
                        
                        if (!Array.isArray(markerData)) {
                            console.error('[App Connector] 标记数据格式无效，不是数组');
                            return;
                        }
                        
                        // 先验证所有标记数据
                        const validMarkers = markerData.filter(marker => {
                            if (!marker) return false;
                            
                            // 添加额外验证逻辑
                            if (typeof marker !== 'object') {
                                console.warn('[App Connector] 跳过无效标记数据，不是对象:', marker);
                                return false;
                            }
                            
                            // 确保至少有描述字段
                            if (!marker.description) {
                                marker.description = '无描述';
                            }
                            
                            // 确保位置对象
                            if (!marker.location) {
                                console.warn('[App Connector] 标记缺少位置数据，将使用默认位置');
                                // 使用默认位置，标记处理器将进一步处理
                                return true;
                            }
                            
                            return true;
                        });
                        
                        console.log(`[App Connector] 验证有效的标记: ${validMarkers.length}/${markerData.length}`);
                        
                        // 分批加载标记，避免一次加载过多导致性能问题
                        const batchSize = 10;
                        const totalMarkers = validMarkers.length;
                        
                        function loadMarkerBatch(startIndex) {
                            const endIndex = Math.min(startIndex + batchSize, totalMarkers);
                            console.log(`[App Connector] 加载标记批次 ${startIndex}-${endIndex-1}/${totalMarkers}`);
                            
                            for (let i = startIndex; i < endIndex; i++) {
                                const marker = validMarkers[i];
                                try {
                                    // 调用 marker-handler.js 中的方法添加标记
                                    if (typeof window.addReportMarker === 'function') {
                                        window.addReportMarker(
                                            marker.location,
                                            marker.description,
                                            marker.id,
                                            marker.image
                                        );
                                    }
                                } catch (error) {
                                    console.error('[App Connector] 添加标记失败:', error, marker);
                                }
                            }
                            
                            // 更新状态显示
                            const markerStatus = document.getElementById('markerStatus');
                            if (markerStatus) {
                                markerStatus.textContent = `已加载 ${endIndex}/${totalMarkers} 个标记`;
                                markerStatus.style.color = 'green';
                            }
                            
                            // 如果还有更多标记，继续加载下一批
                            if (endIndex < totalMarkers) {
                                setTimeout(() => loadMarkerBatch(endIndex), 300);
                            }
                        }
                        
                        // 开始加载第一批
                        loadMarkerBatch(0);
                    } catch (parseError) {
                        console.error('[App Connector] 解析标记数据失败:', parseError);
                        localStorage.removeItem('savedMarkers');
                        // 尝试预加载一些默认标记
                        if (window.MapFix && typeof window.MapFix.preloadMarkerData === 'function') {
                            console.log('[App Connector] 尝试使用MapFix预加载默认标记');
                            window.MapFix.preloadMarkerData();
                            // 重新尝试加载
                            setTimeout(loadFromStorage, 1000);
                        }
                    }
                } else {
                    console.log('[App Connector] 本地存储中没有标记数据');
                    
                    // 尝试从Firebase加载
                    if (window.DataConnector && window.DataConnector.loadMarkersFromFirebase) {
                        console.log('[App Connector] 尝试从Firebase加载标记...');
                        window.DataConnector.loadMarkersFromFirebase();
                    }
                }
            } catch (e) {
                console.error('[App Connector] 从本地存储加载标记失败:', e);
            }
        };
        
        // 延迟加载标记，确保地图已完全初始化
        setTimeout(loadFromStorage, 2000);
    }
    
    // 添加调试信息面板
    function addDebugInfoPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 2000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
        `;
        
        debugPanel.innerHTML = `
            <div style="margin-bottom:10px;font-weight:bold;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:5px;">系统状态</div>
            <div>模式: <span id="apiMode" style="color:#4CAF50;font-weight:bold;">静态模式</span></div>
            <div>地图状态: <span id="mapStatus">检查中...</span></div>
            <div>标记状态: <span id="markerStatus">等待地图加载...</span></div>
            <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:5px;">
                <button id="reloadMapsBtn" style="padding:5px 8px;font-size:12px;background:#0071e3;color:white;border:none;border-radius:4px;cursor:pointer;flex:1;">重新加载地图</button>
                <button id="loadMarkersBtn" style="padding:5px 8px;font-size:12px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer;flex:1;">加载标记</button>
                <button id="toggleDebugBtn" style="padding:5px 8px;font-size:12px;background:#666;color:white;border:none;border-radius:4px;cursor:pointer;flex:1;">隐藏</button>
            </div>
        `;
        
        document.body.appendChild(debugPanel);
        
        // 更新API模式显示
        const apiMode = document.getElementById('apiMode');
        if (apiMode) {
            apiMode.textContent = window.API_MODE === 'static' ? '静态模式' : '在线模式';
            apiMode.style.color = window.API_MODE === 'static' ? '#4CAF50' : '#2196F3';
        }
        
        // 添加按钮事件
        document.getElementById('reloadMapsBtn').addEventListener('click', function() {
            reloadMapsAPI();
        });
        
        document.getElementById('loadMarkersBtn').addEventListener('click', function() {
            // 尝试不同的方法加载标记
            if (window.map) {
                this.textContent = '加载中...';
                
                // 优先使用MapFix对象加载标记
                if (window.MapFix && typeof window.MapFix.loadMarkersFromStorage === 'function') {
                    try {
                        window.MapFix.loadMarkersFromStorage();
                        console.log('[App Connector] 使用MapFix加载标记成功');
                        this.textContent = '加载成功';
                        setTimeout(() => {
                            this.textContent = '加载标记';
                        }, 2000);
                    } catch (e) {
                        console.error('[App Connector] 使用MapFix加载标记失败:', e);
                        this.textContent = '加载失败';
                        setTimeout(() => {
                            this.textContent = '加载标记';
                        }, 2000);
                    }
                    return;
                }
                
                // 尝试从本地存储加载
                try {
                    const storedMarkers = localStorage.getItem('savedMarkers');
                    if (storedMarkers) {
                        try {
                            const markerData = JSON.parse(storedMarkers);
                            console.log(`[App Connector] 手动从本地存储加载了 ${markerData.length} 个标记`);
                            
                            // 验证是否为数组
                            if (!Array.isArray(markerData)) {
                                console.error('[App Connector] 标记数据格式无效，不是数组');
                                this.textContent = '数据格式错误';
                                setTimeout(() => {
                                    this.textContent = '加载标记';
                                }, 2000);
                                return;
                            }
                            
                            // 清除已有标记
                            if (window.markers && window.markers.length > 0) {
                                window.markers.forEach(marker => {
                                    if (marker && marker.setMap) {
                                        marker.setMap(null);
                                    }
                                });
                                window.markers = [];
                            }
                            
                            // 先验证所有标记数据
                            const validMarkers = markerData.filter(marker => {
                                if (!marker) return false;
                                
                                // 添加额外验证逻辑
                                if (typeof marker !== 'object') {
                                    console.warn('[App Connector] 跳过无效标记数据，不是对象:', marker);
                                    return false;
                                }
                                
                                // 确保至少有描述字段
                                if (!marker.description) {
                                    marker.description = '无描述';
                                }
                                
                                // 确保位置对象
                                if (!marker.location) {
                                    console.warn('[App Connector] 标记缺少位置数据，将使用默认位置');
                                    // 标记处理器会处理这种情况
                                    return true;
                                }
                                
                                return true;
                            });
                            
                            console.log(`[App Connector] 验证有效的标记: ${validMarkers.length}/${markerData.length}`);
                            
                            // 分批加载标记，避免一次加载过多导致性能问题
                            const batchSize = 5;
                            const totalMarkers = validMarkers.length;
                            let loadedCount = 0;
                            
                            const loadBatch = (startIndex) => {
                                const endIndex = Math.min(startIndex + batchSize, totalMarkers);
                                
                                for (let i = startIndex; i < endIndex; i++) {
                                    const marker = validMarkers[i];
                                    try {
                                        // 调用 marker-handler.js 中的方法添加标记
                                        if (typeof window.addReportMarker === 'function') {
                                            window.addReportMarker(
                                                marker.location,
                                                marker.description,
                                                marker.id,
                                                marker.image
                                            );
                                            loadedCount++;
                                        }
                                    } catch (error) {
                                        console.error('[App Connector] 添加标记失败:', error, marker);
                                    }
                                }
                                
                                // 更新按钮状态
                                this.textContent = `加载中... ${endIndex}/${totalMarkers}`;
                                
                                // 更新状态显示
                                const markerStatus = document.getElementById('markerStatus');
                                if (markerStatus) {
                                    markerStatus.textContent = `已加载 ${endIndex}/${totalMarkers} 个标记`;
                                    markerStatus.style.color = 'green';
                                }
                                
                                // 继续加载下一批
                                if (endIndex < totalMarkers) {
                                    setTimeout(() => loadBatch(endIndex), 300);
                                } else {
                                    // 完成所有加载
                                    this.textContent = `加载成功 (${loadedCount})`;
                                    setTimeout(() => {
                                        this.textContent = '加载标记';
                                    }, 2000);
                                }
                            };
                            
                            // 开始加载第一批
                            loadBatch(0);
                        } catch (parseError) {
                            console.error('[App Connector] 解析标记数据失败:', parseError);
                            localStorage.removeItem('savedMarkers');
                            this.textContent = '数据解析失败';
                            setTimeout(() => {
                                this.textContent = '加载标记';
                            }, 2000);
                            
                            // 尝试预加载一些默认标记
                            if (window.MapFix && typeof window.MapFix.preloadMarkerData === 'function') {
                                console.log('[App Connector] 尝试使用MapFix预加载默认标记');
                                window.MapFix.preloadMarkerData();
                                
                                setTimeout(() => {
                                    this.textContent = '重新加载';
                                }, 2000);
                            }
                        }
                    } else {
                        console.log('[App Connector] 本地存储中没有标记数据，尝试创建示例标记');
                        
                        // 如果没有标记，创建示例标记
                        if (window.MapFix && typeof window.MapFix.preloadMarkerData === 'function') {
                            window.MapFix.preloadMarkerData();
                            this.textContent = '创建示例标记';
                            setTimeout(() => {
                                this.textContent = '加载标记';
                                // 重新尝试加载
                                this.click();
                            }, 1000);
                        } else if (window.preloadMarkerData) {
                            window.preloadMarkerData();
                            this.textContent = '创建示例标记';
                            setTimeout(() => {
                                this.textContent = '加载标记';
                                // 重新尝试加载
                                this.click();
                            }, 1000);
                        } else {
                            this.textContent = '无标记数据';
                            setTimeout(() => {
                                this.textContent = '加载标记';
                            }, 2000);
                        }
                    }
                } catch (e) {
                    console.error('[App Connector] 手动加载标记失败:', e);
                    this.textContent = '加载失败';
                    setTimeout(() => {
                        this.textContent = '加载标记';
                    }, 2000);
                }
            } else {
                alert('地图尚未初始化，无法加载标记');
                this.textContent = '地图未就绪';
                setTimeout(() => {
                    this.textContent = '加载标记';
                }, 2000);
            }
        });
        
        document.getElementById('toggleDebugBtn').addEventListener('click', function() {
            const panel = document.getElementById('debugPanel');
            if (panel) {
                if (panel.style.height === '20px') {
                    // 展开面板
                    panel.style.height = 'auto';
                    this.textContent = '隐藏';
                } else {
                    // 折叠面板
                    panel.style.height = '20px';
                    panel.style.overflow = 'hidden';
                    this.textContent = '显示';
                }
            }
        });
        
        // 暴露预加载标记函数
        window.preloadMarkerData = function() {
            // 创建示例标记数据
            try {
                console.log('[App Connector] 创建示例标记数据');
                
                // 墨尔本中心位置
                const center = window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631};
                
                // 创建一些示例标记
                const sampleMarkers = [
                    {
                        id: 'sample-1',
                        location: {
                            lat: center.lat + 0.005,
                            lng: center.lng + 0.005
                        },
                        description: '墨尔本中央图书馆',
                        image: null,
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'sample-2',
                        location: {
                            lat: center.lat - 0.007,
                            lng: center.lng + 0.002
                        },
                        description: '弗林德斯火车站',
                        image: null,
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'sample-3',
                        location: {
                            lat: center.lat + 0.001,
                            lng: center.lng - 0.008
                        },
                        description: '墨尔本皇家植物园',
                        image: null,
                        timestamp: new Date().toISOString()
                    }
                ];
                
                // 保存到本地存储
                localStorage.setItem('savedMarkers', JSON.stringify(sampleMarkers));
                console.log('[App Connector] 已创建示例标记数据');
                
                // 更新状态
                const markerStatus = document.getElementById('markerStatus');
                if (markerStatus) {
                    markerStatus.textContent = '已创建示例标记';
                    markerStatus.style.color = '#ff9800';
                }
                
                return true;
            } catch (e) {
                console.error('[App Connector] 创建示例标记数据失败:', e);
                return false;
            }
        };
    }
    
    // 公开方法到全局空间
    window.AppConnector = {
        reloadMapsAPI: reloadMapsAPI,
        initializeMarkers: initializeMarkers
    };
})(); 