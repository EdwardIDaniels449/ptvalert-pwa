/**
 * 紧急地图修复脚本
 * 处理移动端和桌面端地图界面差异，确保按钮响应和标记添加功能
 */

(function() {
    // 设备检测
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    console.log('[紧急修复] 设备类型:', isMobile ? '移动设备' : '桌面设备');

    // 在DOM加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[紧急修复] DOM已加载，准备应用紧急修复');
        
        // 确保按钮点击事件在移动设备上正常工作
        fixButtonEvents();
        
        // 修复地图监听器
        fixMapListeners();
        
        // 确保UI样式一致
        unifyUIStyles();
        
        // 监听地图就绪事件
        document.addEventListener('map_ready', function() {
            console.log('[紧急修复] 地图已就绪，应用额外修复');
            
            // 短暂延迟确保地图完全初始化
            setTimeout(function() {
                // 修复地图点击事件
                fixMapClickHandlers();
                
                // 同步标记数据
                synchronizeMarkers();
            }, 500);
        });
    });
    
    // 修复按钮事件
    function fixButtonEvents() {
        console.log('[紧急修复] 修复按钮事件');
        
        // 添加报告按钮
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            // 移除现有事件监听器
            const newAddReportBtn = addReportBtn.cloneNode(true);
            addReportBtn.parentNode.replaceChild(newAddReportBtn, addReportBtn);
            
            // 添加新的事件监听器
            newAddReportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[紧急修复] 添加报告按钮被点击');
                
                // 检查是否在选点模式
                if (window.isSelectingLocation) {
                    // 取消选点模式
                    window.isSelectingLocation = false;
                    const addReportTip = document.getElementById('addReportTip');
                    if (addReportTip) {
                        addReportTip.style.display = 'none';
                    }
                    
                    newAddReportBtn.textContent = window.currentLang === 'zh' ? '+ 添加报告' : '+ Add Report';
                    document.body.style.cursor = 'default';
                } else {
                    // 进入选点模式
                    window.isSelectingLocation = true;
                    const addReportTip = document.getElementById('addReportTip');
                    if (addReportTip) {
                        addReportTip.style.display = 'block';
                    }
                    
                    newAddReportBtn.textContent = window.currentLang === 'zh' ? '× 取消选点' : '× Cancel Selection';
                    document.body.style.cursor = 'crosshair';
                    
                    console.log('[紧急修复] 已进入选点模式');
                }
            }, { passive: false });
        }
        
        // 快速添加按钮
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            // 移除现有事件监听器
            const newQuickAddBtn = quickAddBtn.cloneNode(true);
            quickAddBtn.parentNode.replaceChild(newQuickAddBtn, quickAddBtn);
            
            // 添加新的事件监听器
            newQuickAddBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[紧急修复] 快速添加按钮被点击');
                
                // 显示快速添加表单
                const quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) {
                    quickAddForm.style.display = 'block';
                }
            }, { passive: false });
        }
        
        // 提交快速添加
        const submitQuickAdd = document.getElementById('submitQuickAdd');
        if (submitQuickAdd) {
            submitQuickAdd.addEventListener('click', function() {
                if (typeof window.submitQuickDescription === 'function') {
                    window.submitQuickDescription();
                }
            }, { passive: false });
        }
        
        // 关闭快速添加
        const quickAddClose = document.getElementById('quickAddClose');
        if (quickAddClose) {
            quickAddClose.addEventListener('click', function() {
                const quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) {
                    quickAddForm.style.display = 'none';
                }
            }, { passive: false });
        }
        
        // 取消快速添加
        const cancelQuickAdd = document.getElementById('cancelQuickAdd');
        if (cancelQuickAdd) {
            cancelQuickAdd.addEventListener('click', function() {
                const quickAddForm = document.getElementById('quickAddForm');
                if (quickAddForm) {
                    quickAddForm.style.display = 'none';
                }
            }, { passive: false });
        }
    }
    
    // 修复地图监听器
    function fixMapListeners() {
        console.log('[紧急修复] 修复地图监听器');
        
        // 确保全局变量已初始化
        window.markers = window.markers || [];
        window.pendingMarkers = window.pendingMarkers || [];
        window.isSelectingLocation = window.isSelectingLocation || false;
        
        // 等待地图API
        const waitForMap = setInterval(function() {
            if (window.map && typeof google !== 'undefined') {
                clearInterval(waitForMap);
                console.log('[紧急修复] 地图已加载，添加事件监听器');
                
                // 添加地图点击监听器
                google.maps.event.addListener(window.map, 'click', function(event) {
                    if (window.isSelectingLocation) {
                        console.log('[紧急修复] 地图被点击，当前在选点模式');
                        
                        const latLng = event.latLng;
                        
                        // 使用UIController处理点击
                        if (window.UIController && typeof window.UIController.selectMapLocation === 'function') {
                            window.UIController.selectMapLocation(latLng);
                        } else if (typeof window.selectMapLocation === 'function') {
                            window.selectMapLocation(latLng);
                        }
                    }
                });
            }
        }, 500);
    }
    
    // 修复地图点击处理
    function fixMapClickHandlers() {
        if (!window.map || typeof google === 'undefined') {
            return;
        }
        
        console.log('[紧急修复] 修复地图点击处理');
        
        // 确保选择位置功能正常工作
        if (typeof window.selectMapLocation !== 'function') {
            window.selectMapLocation = function(latLng) {
                console.log('[紧急修复] 选择地图位置:', latLng.lat(), latLng.lng());
                
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
                const reportForm = document.getElementById('reportForm');
                if (reportForm) {
                    reportForm.style.display = 'block';
                    reportForm.style.transform = 'translateY(0)';
                }
            };
        }
    }
    
    // 统一UI样式，确保移动端和桌面端一致
    function unifyUIStyles() {
        console.log('[紧急修复] 统一UI样式');
        
        // 确保地图容器样式一致
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.style.width = '100%';
            mapElement.style.height = '100vh';
            mapElement.style.position = isMobile ? 'fixed' : 'absolute';
            mapElement.style.top = '0';
            mapElement.style.left = '0';
            mapElement.style.zIndex = '1';
            
            if (isMobile) {
                // 优化移动设备的触摸处理
                mapElement.style.touchAction = 'pan-x pan-y';
                mapElement.style.overflowX = 'hidden';
                mapElement.style.overflowY = 'hidden';
                
                // 硬件加速
                mapElement.style.transform = 'translateZ(0)';
                mapElement.style.webkitTransform = 'translateZ(0)';
                mapElement.style.backfaceVisibility = 'hidden';
                mapElement.style.webkitBackfaceVisibility = 'hidden';
                
                // iOS特定修复
                if (isIOS) {
                    mapElement.style.webkitOverflowScrolling = 'touch';
                }
            }
        }
        
        // 确保UI控件样式一致
        const mapControl = document.querySelector('.map-control');
        if (mapControl) {
            mapControl.style.position = 'fixed';
            mapControl.style.zIndex = '1200';
            
            if (isMobile) {
                mapControl.style.width = '90%';
                mapControl.style.bottom = '20px';
                
                // 支持安全区域
                if ('env' in window) {
                    mapControl.style.bottom = 'max(20px, env(safe-area-inset-bottom))';
                }
            }
        }
        
        // 确保按钮样式一致
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            if (isMobile) {
                addReportBtn.style.padding = '14px';
                addReportBtn.style.fontSize = '16px';
                addReportBtn.style.borderRadius = '10px';
                addReportBtn.style.webkitTapHighlightColor = 'transparent';
            }
        }
        
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            if (isMobile) {
                quickAddBtn.style.padding = '14px';
                quickAddBtn.style.fontSize = '16px';
                quickAddBtn.style.borderRadius = '10px';
                quickAddBtn.style.webkitTapHighlightColor = 'transparent';
            }
        }
    }
    
    // 同步标记数据，确保移动端和桌面端显示相同数量的标记
    function synchronizeMarkers() {
        console.log('[紧急修复] 同步标记数据');
        
        // 加载保存的标记
        const savedMarkers = localStorage.getItem('savedMarkers');
        if (savedMarkers) {
            try {
                const markersData = JSON.parse(savedMarkers);
                
                // 如果当前标记数量与保存的不一致，则重新加载
                if (!window.markers || window.markers.length !== markersData.length) {
                    console.log('[紧急修复] 标记数量不一致，重新加载标记');
                    
                    // 清除现有标记
                    if (window.markers) {
                        window.markers.forEach(function(marker) {
                            if (marker && marker.setMap) {
                                marker.setMap(null);
                            }
                        });
                    }
                    
                    // 重置标记数组
                    window.markers = [];
                    
                    // 加载保存的标记
                    markersData.forEach(function(markerData) {
                        if (window.addReportMarker) {
                            window.addReportMarker(
                                {lat: markerData.lat, lng: markerData.lng},
                                markerData.description
                            );
                        } else if (window.UIController && window.UIController.addReportMarker) {
                            window.UIController.addReportMarker(
                                {lat: markerData.lat, lng: markerData.lng},
                                markerData.description
                            );
                        }
                    });
                    
                    console.log('[紧急修复] 已重新加载', markersData.length, '个标记');
                }
            } catch (error) {
                console.error('[紧急修复] 加载标记数据出错:', error);
            }
        }
    }
})();