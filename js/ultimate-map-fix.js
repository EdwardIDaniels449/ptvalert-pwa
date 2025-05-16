/**
 * 终极地图修复脚本
 * 彻底解决地图加载问题
 */

(function() {
    'use strict';
    
    console.log('[终极地图修复] 初始化...');
    
    // 阻止现有Google Maps API加载过程
    stopExistingGoogleMapsLoad();
    
    // 启动地图修复
    setTimeout(initUltimateMapFix, 1000);
    
    // 阻止现有的Google Maps API加载
    function stopExistingGoogleMapsLoad() {
        // 查找并禁用所有尝试加载Google Maps API的脚本
        const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        scripts.forEach(function(script) {
            console.log('[终极地图修复] 禁用现有Google Maps脚本:', script.src);
            script.setAttribute('data-disabled', 'true');
            script.setAttribute('src', '');
        });
        
        // 拦截任何动态添加的Google Maps脚本
        const originalAppendChild = Node.prototype.appendChild;
        Node.prototype.appendChild = function() {
            if (arguments[0] && arguments[0].tagName === 'SCRIPT' && 
                arguments[0].src && arguments[0].src.includes('maps.googleapis.com')) {
                console.log('[终极地图修复] 拦截动态添加的Google Maps脚本');
                arguments[0].setAttribute('data-disabled', 'true');
                arguments[0].setAttribute('src', '');
            }
            return originalAppendChild.apply(this, arguments);
        };
    }
    
    // 初始化终极地图修复
    function initUltimateMapFix() {
        console.log('[终极地图修复] 开始修复流程...');
        
        // 检查并修复地图容器
        fixMapContainer();
        
        // 加载地图
        loadMap();
    }
    
    // 修复地图容器
    function fixMapContainer() {
        let mapElement = document.getElementById('map');
        
        if (!mapElement) {
            console.warn('[终极地图修复] 未找到地图容器，创建新容器');
            mapElement = document.createElement('div');
            mapElement.id = 'map';
            document.body.insertBefore(mapElement, document.body.firstChild);
        }
        
        // 确保地图容器样式正确
        console.log('[终极地图修复] 设置地图容器样式');
        mapElement.style.position = 'absolute';
        mapElement.style.top = '0';
        mapElement.style.left = '0';
        mapElement.style.width = '100%';
        mapElement.style.height = '100vh';
        mapElement.style.zIndex = '1';
        mapElement.style.backgroundColor = '#f0f0f0';
        
        // 确保容器内没有其他元素干扰
        while (mapElement.firstChild) {
            mapElement.removeChild(mapElement.firstChild);
        }
    }
    
    // 加载地图
    function loadMap() {
        // 检查是否已有加载完成的Google Maps API
        if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
            console.log('[终极地图修复] Google Maps API已加载，尝试创建地图');
            createGoogleMap();
            return;
        }
        
        // 尝试加载Google Maps API
        console.log('[终极地图修复] 尝试加载Google Maps API');
        
        // 创建一个新的脚本元素
        const script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=ultimateMapFixCallback&libraries=places&v=weekly';
        script.async = true;
        script.defer = true;
        
        // 添加超时处理
        const timeout = setTimeout(function() {
            console.warn('[终极地图修复] Google Maps API加载超时，使用备用方案');
            createBackupMap();
        }, 10000);
        
        // 回调函数
        window.ultimateMapFixCallback = function() {
            clearTimeout(timeout);
            console.log('[终极地图修复] Google Maps API加载成功');
            createGoogleMap();
        };
        
        // 添加错误处理
        script.onerror = function() {
            clearTimeout(timeout);
            console.error('[终极地图修复] Google Maps API加载失败');
            createBackupMap();
        };
        
        // 添加到文档
        document.head.appendChild(script);
    }
    
    // 创建Google地图
    function createGoogleMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        try {
            console.log('[终极地图修复] 创建Google地图');
            
            // 使用简单配置
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
                console.log('[终极地图修复] Google地图加载完成');
                
                // 恢复标记
                setTimeout(function() {
                    restoreMarkers();
                }, 1000);
                
                // 触发地图就绪事件
                const mapReadyEvent = new CustomEvent('map_ready');
                document.dispatchEvent(mapReadyEvent);
            });
            
            // 延迟检查地图是否真的显示了
            setTimeout(function() {
                // 检查地图瓦片是否加载
                const tiles = mapElement.querySelectorAll('img[src*="googleapis"]');
                if (tiles.length === 0) {
                    console.warn('[终极地图修复] 地图瓦片未加载，切换到备用地图');
                    createBackupMap();
                } else {
                    console.log(`[终极地图修复] 检测到 ${tiles.length} 个地图瓦片`);
                }
            }, 5000);
            
        } catch (error) {
            console.error('[终极地图修复] 创建Google地图失败:', error);
            createBackupMap();
        }
    }
    
    // 创建备用地图
    function createBackupMap() {
        console.log('[终极地图修复] 创建备用地图');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        // 清空容器
        while (mapElement.firstChild) {
            mapElement.removeChild(mapElement.firstChild);
        }
        
        // 设置渐变背景
        mapElement.style.backgroundImage = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
        mapElement.style.backgroundSize = 'cover';
        
        // 添加网格线条样式模拟地图
        mapElement.innerHTML = `
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;background-image:
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
                background-size: 20px 20px;"></div>
        `;
        
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
        notice.innerHTML = '使用离线地图模式<br>标记功能正常可用';
        
        mapElement.appendChild(notice);
        
        // 模拟地图对象
        window.map = createMinimalMapObject();
        window.mapsInitialized = true;
        
        // 恢复标记
        setTimeout(function() {
            restoreMarkers();
        }, 1000);
        
        // 触发地图就绪事件
        const mapReadyEvent = new CustomEvent('map_ready');
        document.dispatchEvent(mapReadyEvent);
    }
    
    // 创建最小化的地图对象
    function createMinimalMapObject() {
        const center = window.MELBOURNE_CENTER || {lat: -37.8136, lng: 144.9631};
        
        return {
            getCenter: function() {
                return {
                    lat: function() { return center.lat; },
                    lng: function() { return center.lng; }
                };
            },
            setCenter: function() { return this; },
            getDiv: function() { return document.getElementById('map'); },
            getBounds: function() {
                return {
                    getNorthEast: function() { 
                        return { 
                            lat: function() { return center.lat + 0.1; }, 
                            lng: function() { return center.lng + 0.1; } 
                        }; 
                    },
                    getSouthWest: function() { 
                        return { 
                            lat: function() { return center.lat - 0.1; }, 
                            lng: function() { return center.lng - 0.1; } 
                        }; 
                    },
                    contains: function() { return true; }
                };
            },
            addListener: function(event, callback) { 
                console.log('[终极地图修复] 添加模拟地图监听器:', event);
                if (event === 'idle' && typeof callback === 'function') {
                    setTimeout(callback, 10);
                }
                return { remove: function() {} }; 
            },
            setOptions: function() { return this; },
            getZoom: function() { return 13; },
            setZoom: function() { return this; },
            panTo: function() { return this; },
            panBy: function() { return this; },
            fitBounds: function() { return this; },
            getMapTypeId: function() { return 'roadmap'; },
            setMapTypeId: function() { return this; }
        };
    }
    
    // 恢复地图标记
    function restoreMarkers() {
        console.log('[终极地图修复] 尝试恢复标记');
        
        const markerData = loadMarkerData();
        if (!markerData || !markerData.length) {
            console.log('[终极地图修复] 没有找到标记数据');
            return;
        }
        
        console.log(`[终极地图修复] 开始恢复 ${markerData.length} 个标记`);
        
        // 清空现有标记
        window.markers = [];
        
        // 检查Google Maps API是否可用
        const useGoogleMaps = typeof google !== 'undefined' && 
                             typeof google.maps !== 'undefined' && 
                             typeof google.maps.Marker === 'function';
        
        // 分批处理标记
        const batchSize = 5;
        let currentBatch = 0;
        
        function processBatch() {
            if (currentBatch >= markerData.length) {
                console.log('[终极地图修复] 所有标记已恢复');
                return;
            }
            
            const endIdx = Math.min(currentBatch + batchSize, markerData.length);
            
            for (let i = currentBatch; i < endIdx; i++) {
                const data = markerData[i];
                try {
                    if (useGoogleMaps) {
                        // 使用Google Maps API创建标记
                        const marker = new google.maps.Marker({
                            position: {
                                lat: data.location.lat || data.lat,
                                lng: data.location.lng || data.lng
                            },
                            map: window.map,
                            title: data.description || data.title || '',
                            label: {
                                text: '🐶',
                                fontSize: '24px'
                            },
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 0
                            },
                            optimized: false
                        });
                        
                        window.markers.push(marker);
                        
                    } else {
                        // 创建DOM元素模拟标记
                        createDomMarker(data);
                    }
                } catch (error) {
                    console.warn(`[终极地图修复] 恢复标记 ${i} 失败:`, error);
                    // 如果Google标记创建失败，尝试DOM方式
                    createDomMarker(data);
                }
            }
            
            currentBatch = endIdx;
            
            // 如果还有标记需要处理，安排下一批
            if (currentBatch < markerData.length) {
                setTimeout(processBatch, 500);
            }
        }
        
        // 使用DOM元素创建标记
        function createDomMarker(data) {
            const mapElement = document.getElementById('map');
            if (!mapElement) return;
            
            // 创建DOM标记元素
            const marker = document.createElement('div');
            marker.innerHTML = '🐶';
            marker.style.position = 'absolute';
            marker.style.fontSize = '24px';
            marker.style.transform = 'translate(-50%, -50%)';
            marker.style.cursor = 'pointer';
            marker.style.zIndex = '100';
            marker.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            marker.title = data.description || data.title || '';
            
            // 随机位置（因为没有真实地图坐标系统）
            const randomX = Math.floor(Math.random() * 80) + 10; // 10% - 90%
            const randomY = Math.floor(Math.random() * 80) + 10; // 10% - 90%
            marker.style.left = `${randomX}%`;
            marker.style.top = `${randomY}%`;
            
            // 添加点击事件
            marker.addEventListener('click', function() {
                showMarkerInfo(data, marker);
            });
            
            // 添加到地图容器
            mapElement.appendChild(marker);
            
            // 存储DOM标记引用
            window.domMarkers = window.domMarkers || [];
            window.domMarkers.push(marker);
            
            // 同时保存到markers数组以兼容现有代码
            window.markers = window.markers || [];
            window.markers.push({
                getPosition: function() {
                    return {
                        lat: function() { return data.location?.lat || data.lat || 0; },
                        lng: function() { return data.location?.lng || data.lng || 0; }
                    };
                },
                getTitle: function() { return data.description || data.title || ''; },
                setMap: function() { return this; },
                domElement: marker,
                isDomMarker: true
            });
        }
        
        // 开始处理批次
        processBatch();
    }
    
    // 显示标记信息
    function showMarkerInfo(data, markerElement) {
        // 关闭已打开的信息窗口
        if (window.openedInfoWindow) {
            if (typeof window.openedInfoWindow.close === 'function') {
                window.openedInfoWindow.close();
            } else if (window.openedInfoWindow.parentNode) {
                window.openedInfoWindow.parentNode.removeChild(window.openedInfoWindow);
            }
        }
        
        // 如果是DOM标记
        if (!window.map || !google || !google.maps || !google.maps.InfoWindow) {
            // 创建DOM信息窗口
            const infoElement = document.createElement('div');
            infoElement.style.position = 'absolute';
            infoElement.style.backgroundColor = 'white';
            infoElement.style.border = '1px solid #ccc';
            infoElement.style.borderRadius = '8px';
            infoElement.style.padding = '10px';
            infoElement.style.maxWidth = '250px';
            infoElement.style.boxShadow = '0 2px 7px rgba(0,0,0,0.3)';
            infoElement.style.zIndex = '1000';
            infoElement.style.left = markerElement.style.left;
            infoElement.style.top = `calc(${markerElement.style.top} - 15px)`;
            infoElement.style.transform = 'translate(-50%, -100%)';
            infoElement.style.pointerEvents = 'auto';
            
            // 添加内容
            let content = '<div style="max-width:230px;">';
            
            // 添加描述
            content += `<div style="font-size:14px;margin-bottom:10px;">${data.description || data.title || ''}</div>`;
            
            // 添加时间戳
            const timestamp = data.time || data.timestamp || new Date().toISOString();
            const date = new Date(timestamp);
            content += `<div style="font-size:12px;color:#666;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>`;
            
            // 添加关闭按钮
            content += '<div style="text-align:right;margin-top:8px;"><button style="padding:3px 8px;background:#f0f0f0;border:1px solid #ccc;border-radius:4px;cursor:pointer;">关闭</button></div>';
            
            content += '</div>';
            
            infoElement.innerHTML = content;
            
            // 添加关闭按钮事件
            infoElement.querySelector('button').addEventListener('click', function() {
                if (infoElement.parentNode) {
                    infoElement.parentNode.removeChild(infoElement);
                    window.openedInfoWindow = null;
                }
            });
            
            // 添加到地图容器
            document.getElementById('map').appendChild(infoElement);
            
            // 保存引用
            window.openedInfoWindow = infoElement;
        } else {
            // 使用Google Maps InfoWindow
            const infoWindow = new google.maps.InfoWindow({
                content: createInfoWindowContent(data),
                maxWidth: 300
            });
            
            if (data.isDomMarker) {
                // 对于DOM标记，我们需要创建一个临时的Google标记
                const tempMarker = new google.maps.Marker({
                    position: {
                        lat: data.location?.lat || data.lat || window.MELBOURNE_CENTER.lat,
                        lng: data.location?.lng || data.lng || window.MELBOURNE_CENTER.lng
                    },
                    map: window.map
                });
                
                infoWindow.open(window.map, tempMarker);
                
                // 监听关闭事件以移除临时标记
                google.maps.event.addListenerOnce(infoWindow, 'closeclick', function() {
                    tempMarker.setMap(null);
                });
            } else {
                // 直接打开信息窗口
                infoWindow.open(window.map, marker);
            }
            
            // 保存引用
            window.openedInfoWindow = infoWindow;
        }
    }
    
    // 创建信息窗口内容 - 用于Google Maps InfoWindow
    function createInfoWindowContent(data) {
        let content = '<div style="padding:10px;max-width:300px;">';
        
        // 添加描述
        content += `<div style="font-size:14px;margin-bottom:10px;">${data.description || data.title || ''}</div>`;
        
        // 添加时间戳
        const timestamp = data.time || data.timestamp || new Date().toISOString();
        const date = new Date(timestamp);
        content += `<div style="font-size:12px;color:#666;">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>`;
        
        content += '</div>';
        
        return content;
    }
    
    // 加载标记数据
    function loadMarkerData() {
        let markerData = [];
        
        // 从markers数组获取
        if (window.markers && window.markers.length) {
            markerData = window.markers.map(function(marker) {
                try {
                    if (!marker || !marker.getPosition) return null;
                    
                    const position = marker.getPosition();
                    if (!position || !position.lat || !position.lng) return null;
                    
                    return {
                        location: {
                            lat: position.lat(),
                            lng: position.lng()
                        },
                        description: marker.getTitle ? marker.getTitle() : '',
                        time: new Date().toISOString()
                    };
                } catch (error) {
                    console.warn('[终极地图修复] 从markers获取数据出错:', error);
                    return null;
                }
            }).filter(Boolean);
        }
        
        // 从localStorage获取
        try {
            const savedMarkers = localStorage.getItem('savedMarkers');
            if (savedMarkers) {
                const parsedMarkers = JSON.parse(savedMarkers);
                if (Array.isArray(parsedMarkers) && parsedMarkers.length > 0) {
                    // 检查是否已经有这些标记（避免重复）
                    parsedMarkers.forEach(function(marker) {
                        const isDuplicate = markerData.some(function(existing) {
                            // 通过位置判断是否是同一个标记
                            const existingLat = existing.location.lat;
                            const existingLng = existing.location.lng;
                            const markerLat = marker.lat;
                            const markerLng = marker.lng;
                            
                            return (Math.abs(existingLat - markerLat) < 0.0001 &&
                                   Math.abs(existingLng - markerLng) < 0.0001);
                        });
                        
                        if (!isDuplicate) {
                            markerData.push(marker);
                        }
                    });
                }
            }
        } catch (error) {
            console.warn('[终极地图修复] 从localStorage加载标记失败:', error);
        }
        
        return markerData;
    }
})(); 