/**
 * 增强型地图修复脚本
 * 解决严重的"setMap: not an instance of Map"错误和地图显示问题
 */

(function() {
    'use strict';
    
    console.log('[增强型地图修复] 初始化...');
    
    // 保存原始的函数以便恢复
    const originalUIControllerAddMarker = window.UIController && window.UIController.addReportMarker;
    const originalGoogleMapsCallback = window.googleMapsLoadedCallback;
    
    // 错误计数器和时间戳
    let lastErrorTime = 0;
    let errorCounter = 0;
    const ERROR_RESET_INTERVAL = 5000; // 5秒内的错误才累计计数
    
    // 立即执行修复
    initializeMapFix();
    
    // 主初始化函数
    function initializeMapFix() {
        // 监听未捕获的错误
        window.addEventListener('error', handleGlobalError);
        
        // 替换关键函数
        patchMapFunctions();
        
        // 检查和修复地图状态
        setTimeout(checkAndFixMapStatus, 1000);
        
        // 定期检查地图状态
        setInterval(checkAndFixMapStatus, 5000);
    }
    
    // 处理未捕获的错误
    function handleGlobalError(event) {
        // 只处理与setMap相关的错误
        if (event && event.error && event.error.message && 
            event.error.message.includes('setMap: not an instance of Map')) {
            
            const now = Date.now();
            
            // 重置5秒前的计数
            if (now - lastErrorTime > ERROR_RESET_INTERVAL) {
                errorCounter = 0;
            }
            
            lastErrorTime = now;
            errorCounter++;
            
            console.warn(`[增强型地图修复] 捕获到setMap错误 #${errorCounter}`);
            
            // 如果错误频繁发生，尝试强制修复
            if (errorCounter > 10) {
                console.error('[增强型地图修复] 检测到频繁的setMap错误，开始强制修复');
                errorCounter = 0; // 重置计数器
                forceMapRecreation();
                event.preventDefault(); // 尝试阻止错误继续传播
            }
        }
    }
    
    // 修补关键地图函数
    function patchMapFunctions() {
        // 安全替换UIController.addReportMarker函数
        if (window.UIController) {
            console.log('[增强型地图修复] 替换UIController.addReportMarker');
            
            window.UIController.addReportMarker = function(location, description, reportId, image) {
                // 检查地图实例是否有效
                if (!isValidMap(window.map)) {
                    console.warn('[增强型地图修复] 地图无效，无法添加标记');
                    
                    // 保存到待处理队列
                    window.pendingMarkers = window.pendingMarkers || [];
                    window.pendingMarkers.push({
                        location: location,
                        description: description,
                        reportId: reportId,
                        image: image
                    });
                    
                    // 尝试修复地图
                    setTimeout(forceMapRecreation, 500);
                    
                    return null;
                }
                
                // 尝试调用原始函数
                try {
                    if (originalUIControllerAddMarker) {
                        return originalUIControllerAddMarker(location, description, reportId, image);
                    } else {
                        // 如果原始函数不可用，创建简单替代标记
                        return createSimpleMarker(location, description);
                    }
                } catch (error) {
                    console.error('[增强型地图修复] 添加标记失败:', error);
                    // 修复并重试
                    setTimeout(function() {
                        forceMapRecreation();
                    }, 1000);
                    return null;
                }
            };
        }
        
        // 修补Google Maps回调函数，确保安全处理标记
        if (window.googleMapsLoadedCallback) {
            console.log('[增强型地图修复] 替换googleMapsLoadedCallback');
            
            window.googleMapsLoadedCallback = function() {
                try {
                    // 调用原始回调
                    if (originalGoogleMapsCallback) {
                        originalGoogleMapsCallback();
                    }
                    
                    // 额外安全措施
                    setTimeout(function() {
                        safelyProcessPendingMarkers();
                    }, 3000);
                } catch (error) {
                    console.error('[增强型地图修复] 回调执行出错:', error);
                    forceMapRecreation();
                }
            };
        }
    }
    
    // 安全处理待处理的标记
    function safelyProcessPendingMarkers() {
        if (!window.pendingMarkers || !window.pendingMarkers.length) {
            return;
        }
        
        console.log(`[增强型地图修复] 安全处理 ${window.pendingMarkers.length} 个待处理标记`);
        
        // 检查地图是否有效
        if (!isValidMap(window.map)) {
            console.warn('[增强型地图修复] 地图实例无效，暂不处理待处理标记');
            return;
        }
        
        // 创建一个待处理标记的副本，然后清空待处理队列
        const pendingMarkersCopy = window.pendingMarkers.slice();
        window.pendingMarkers = [];
        
        // 小批量处理标记，避免一次性添加太多
        const batchSize = 5;
        let currentBatch = 0;
        
        function processBatch() {
            if (currentBatch >= pendingMarkersCopy.length) {
                console.log('[增强型地图修复] 所有待处理标记已处理完成');
                return;
            }
            
            const endIdx = Math.min(currentBatch + batchSize, pendingMarkersCopy.length);
            console.log(`[增强型地图修复] 处理标记批次 ${currentBatch} 到 ${endIdx}`);
            
            for (let i = currentBatch; i < endIdx; i++) {
                const markerData = pendingMarkersCopy[i];
                try {
                    createSimpleMarker(markerData.location, markerData.description);
                } catch (error) {
                    console.warn(`[增强型地图修复] 处理标记 ${i} 失败:`, error);
                }
            }
            
            currentBatch = endIdx;
            setTimeout(processBatch, 1000);
        }
        
        // 开始处理
        processBatch();
    }
    
    // 创建简化版标记
    function createSimpleMarker(location, description) {
        if (!window.map || !window.google || !window.google.maps) {
            console.warn('[增强型地图修复] 无法创建标记：地图或Google Maps API不可用');
            return null;
        }
        
        try {
            // 使用最简单的标记创建方式，避免不必要的选项
            const marker = new google.maps.Marker({
                position: location,
                map: window.map,
                title: description
            });
            
            // 记录标记
            if (!window.markers) window.markers = [];
            window.markers.push(marker);
            
            // 如果标记没有reportData，增加一个
            marker.reportData = {
                id: 'marker-' + Date.now(),
                location: location,
                description: description,
                time: new Date().toISOString()
            };
            
            return marker;
        } catch (error) {
            console.error('[增强型地图修复] 创建简单标记失败:', error);
            return null;
        }
    }
    
    // 检查地图实例是否有效
    function isValidMap(mapInstance) {
        if (!mapInstance) return false;
        
        // 检查是否是有效的Google Maps实例
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined' &&
            google.maps.Map && mapInstance instanceof google.maps.Map) {
            return true;
        }
        
        // 检查是否有关键方法
        if (typeof mapInstance.getCenter === 'function' &&
            typeof mapInstance.setCenter === 'function' &&
            typeof mapInstance.getDiv === 'function') {
            return true;
        }
        
        return false;
    }
    
    // 检查并修复地图状态
    function checkAndFixMapStatus() {
        // 检查地图容器
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[增强型地图修复] 地图容器不存在');
            return;
        }
        
        // 检查地图容器大小
        if (mapElement.offsetWidth < 50 || mapElement.offsetHeight < 50) {
            console.warn('[增强型地图修复] 地图容器尺寸异常');
            fixMapContainerStyles(mapElement);
        }
        
        // 检查地图实例
        if (!window.map) {
            console.warn('[增强型地图修复] 地图实例不存在');
            forceMapRecreation();
            return;
        }
        
        // 如果当前地图是模拟实例，但真实API已加载，则重新创建地图
        if (!isValidMap(window.map) && typeof google !== 'undefined' && 
            typeof google.maps !== 'undefined' && typeof google.maps.Map === 'function') {
            console.warn('[增强型地图修复] 检测到无效的地图实例，但Google Maps API已加载');
            forceMapRecreation();
        }
    }
    
    // 修复地图容器样式
    function fixMapContainerStyles(mapElement) {
        mapElement.style.position = 'absolute';
        mapElement.style.top = '0';
        mapElement.style.left = '0';
        mapElement.style.width = '100%';
        mapElement.style.height = '100vh';
        mapElement.style.zIndex = '1';
        mapElement.style.backgroundColor = '#f0f0f0';
        
        console.log('[增强型地图修复] 已修复地图容器样式');
    }
    
    // 强制重新创建地图
    function forceMapRecreation() {
        console.log('[增强型地图修复] 开始强制重新创建地图...');
        
        // 检查Google Maps API是否加载
        if (typeof google === 'undefined' || typeof google.maps === 'undefined' || 
            typeof google.maps.Map !== 'function') {
            console.warn('[增强型地图修复] Google Maps API未加载，无法创建真实地图');
            createFallbackMap();
            return;
        }
        
        // 获取地图容器
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[增强型地图修复] 找不到地图容器');
            return;
        }
        
        // 备份标记数据
        const markerDataBackup = backupMarkerData();
        
        // 清空容器
        while (mapElement.firstChild) {
            mapElement.removeChild(mapElement.firstChild);
        }
        
        // 重置样式
        fixMapContainerStyles(mapElement);
        
        // 创建新地图
        try {
            // 使用默认选项，避免复杂配置可能导致的问题
            const mapOptions = {
                center: window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631},
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                fullscreenControl: false,
                streetViewControl: false,
                mapTypeControl: false
            };
            
            // 创建新的地图实例
            window.map = new google.maps.Map(mapElement, mapOptions);
            
            // 设置初始化标志
            window.mapsInitialized = true;
            
            // 监听地图空闲事件
            google.maps.event.addListenerOnce(window.map, 'idle', function() {
                console.log('[增强型地图修复] 新地图加载完成');
                
                // 恢复标记
                setTimeout(function() {
                    restoreMarkers(markerDataBackup);
                }, 1000);
                
                // 触发地图就绪事件
                const mapReadyEvent = new CustomEvent('map_ready');
                document.dispatchEvent(mapReadyEvent);
            });
            
            console.log('[增强型地图修复] 已成功创建新的地图实例');
        } catch (error) {
            console.error('[增强型地图修复] 创建新地图失败:', error);
            createFallbackMap();
        }
    }
    
    // 创建备用地图
    function createFallbackMap() {
        console.log('[增强型地图修复] 创建备用地图');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        // 设置背景样式
        mapElement.style.backgroundImage = 'linear-gradient(135deg, #dcdcdc 0%, #b5b5b5 100%)';
        mapElement.style.backgroundSize = 'cover';
        
        // 添加提示文本
        const notice = document.createElement('div');
        notice.style.position = 'absolute';
        notice.style.top = '50%';
        notice.style.left = '50%';
        notice.style.transform = 'translate(-50%, -50%)';
        notice.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notice.style.color = 'white';
        notice.style.padding = '15px 20px';
        notice.style.borderRadius = '8px';
        notice.style.fontSize = '16px';
        notice.style.textAlign = 'center';
        notice.style.maxWidth = '80%';
        notice.style.zIndex = '1000';
        notice.innerHTML = '地图加载受限，但标记功能可正常使用<br>刷新页面可能解决此问题';
        
        mapElement.appendChild(notice);
        
        // 模拟地图对象
        window.map = createMinimalMapObject();
        window.mapsInitialized = true;
    }
    
    // 创建最小化的地图对象
    function createMinimalMapObject() {
        return {
            getCenter: function() {
                return {
                    lat: function() { return window.MELBOURNE_CENTER.lat; },
                    lng: function() { return window.MELBOURNE_CENTER.lng; }
                };
            },
            setCenter: function() { return this; },
            getDiv: function() { return document.getElementById('map'); },
            getBounds: function() {
                return {
                    getNorthEast: function() { 
                        return { 
                            lat: function() { return window.MELBOURNE_CENTER.lat + 0.1; }, 
                            lng: function() { return window.MELBOURNE_CENTER.lng + 0.1; } 
                        }; 
                    },
                    getSouthWest: function() { 
                        return { 
                            lat: function() { return window.MELBOURNE_CENTER.lat - 0.1; }, 
                            lng: function() { return window.MELBOURNE_CENTER.lng - 0.1; } 
                        }; 
                    }
                };
            },
            addListener: function() { return { remove: function() {} }; },
            setOptions: function() { return this; }
        };
    }
    
    // 备份标记数据
    function backupMarkerData() {
        const backupData = [];
        
        // 从markers数组中提取数据
        if (window.markers && window.markers.length) {
            window.markers.forEach(function(marker) {
                try {
                    if (!marker) return;
                    
                    const data = {
                        position: marker.getPosition ? marker.getPosition() : null,
                        title: marker.getTitle ? marker.getTitle() : '',
                        reportData: marker.reportData || {}
                    };
                    
                    if (data.position) {
                        backupData.push({
                            location: {
                                lat: data.position.lat(),
                                lng: data.position.lng()
                            },
                            description: data.title || data.reportData.description || '',
                            time: data.reportData.time || new Date().toISOString(),
                            id: data.reportData.id || ('marker-' + Date.now())
                        });
                    }
                } catch (error) {
                    console.warn('[增强型地图修复] 备份标记数据时出错:', error);
                }
            });
        }
        
        // 从localStorage加载备份
        try {
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (savedMarkers) {
                const parsedMarkers = JSON.parse(savedMarkers);
                if (Array.isArray(parsedMarkers)) {
                    // 过滤已有的标记（基于位置）
                    parsedMarkers.forEach(function(marker) {
                        // 检查此标记是否已在备份中
                        const isDuplicate = backupData.some(function(existing) {
                            return Math.abs(existing.location.lat - marker.lat) < 0.0001 &&
                                   Math.abs(existing.location.lng - marker.lng) < 0.0001;
                        });
                        
                        if (!isDuplicate && marker.lat && marker.lng) {
                            backupData.push({
                                location: { lat: marker.lat, lng: marker.lng },
                                description: marker.description || '',
                                time: marker.time || new Date().toISOString(),
                                id: marker.id || ('marker-' + Date.now())
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('[增强型地图修复] 从localStorage加载标记失败:', error);
        }
        
        console.log(`[增强型地图修复] 已备份 ${backupData.length} 个标记数据`);
        return backupData;
    }
    
    // 恢复标记
    function restoreMarkers(markerDataArray) {
        if (!markerDataArray || !markerDataArray.length) {
            console.log('[增强型地图修复] 没有标记数据需要恢复');
            return;
        }
        
        console.log(`[增强型地图修复] 开始恢复 ${markerDataArray.length} 个标记`);
        
        // 清空现有标记
        window.markers = [];
        
        // 按小批次恢复标记，避免一次性添加过多造成性能问题
        const batchSize = 5;
        let currentBatch = 0;
        
        function processBatch() {
            if (currentBatch >= markerDataArray.length) {
                console.log('[增强型地图修复] 所有标记已恢复');
                return;
            }
            
            const endIdx = Math.min(currentBatch + batchSize, markerDataArray.length);
            console.log(`[增强型地图修复] 恢复标记批次 ${currentBatch} 到 ${endIdx}`);
            
            for (let i = currentBatch; i < endIdx; i++) {
                const data = markerDataArray[i];
                try {
                    createSimpleMarker(data.location, data.description);
                } catch (error) {
                    console.warn(`[增强型地图修复] 恢复标记 ${i} 失败:`, error);
                }
            }
            
            currentBatch = endIdx;
            
            // 如果还有标记需要处理，安排下一批
            if (currentBatch < markerDataArray.length) {
                setTimeout(processBatch, 1000);
            }
        }
        
        // 开始处理
        processBatch();
    }
})(); 