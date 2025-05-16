/**
 * Google Maps API setMap修复脚本
 * 主动修复Google Maps API中的setMap方法，防止"not an instance of Map"错误
 */

(function() {
    'use strict';
    
    console.log('[SetMap Fix] 初始化Google Maps setMap修复脚本');
    
    // 在页面加载完成后应用修复
    window.addEventListener('load', function() {
        setTimeout(applySetMapFix, 1000);
    });
    
    // 如果Google Maps API已加载，立即应用修复
    if (window.google && window.google.maps) {
        applySetMapFix();
    }
    
    // 应用setMap修复
    function applySetMapFix() {
        // 等待Google Maps API完全加载
        const waitForMaps = setInterval(function() {
            if (window.google && window.google.maps && window.google.maps.Marker) {
                clearInterval(waitForMaps);
                monkeyPatchSetMap();
            }
        }, 100);
        
        // 最多等待20秒
        setTimeout(function() {
            clearInterval(waitForMaps);
            // 最后一次尝试
            if (window.google && window.google.maps && window.google.maps.Marker) {
                monkeyPatchSetMap();
            } else {
                console.warn('[SetMap Fix] Google Maps API未加载，无法应用修复');
            }
        }, 20000);
    }
    
    // 修改Google Maps API中的setMap方法
    function monkeyPatchSetMap() {
        try {
            console.log('[SetMap Fix] 开始修复Google Maps Marker.setMap方法');
            
            if (!window.google || !window.google.maps || !window.google.maps.Marker) {
                console.warn('[SetMap Fix] Google Maps Marker不可用，无法修复');
                return;
            }
            
            // 保存原始setMap方法
            const originalSetMap = window.google.maps.Marker.prototype.setMap;
            
            // 替换为增强版本
            window.google.maps.Marker.prototype.setMap = function(map) {
                try {
                    // 检查参数有效性
                    if (map !== null && 
                        (!map || 
                         typeof map !== 'object' || 
                         (typeof map.getDiv !== 'function' && typeof map.getStreetView !== 'function'))) {
                        
                        console.warn('[SetMap Fix] 检测到无效的地图对象:', map);
                        
                        // 针对无效map参数的特殊处理
                        if (map === undefined) {
                            console.log('[SetMap Fix] 将undefined参数转换为null');
                            return originalSetMap.call(this, null);
                        }
                        
                        // 尝试获取全局地图对象
                        if (window.map && 
                            typeof window.map === 'object' && 
                            typeof window.map.getDiv === 'function') {
                            
                            console.log('[SetMap Fix] 使用全局地图对象代替无效参数');
                            return originalSetMap.call(this, window.map);
                        }
                        
                        // 最坏情况下，忽略调用
                        console.warn('[SetMap Fix] 跳过无效setMap调用');
                        return;
                    }
                    
                    // 如果参数有效或为null，调用原始方法
                    return originalSetMap.call(this, map);
                } catch (error) {
                    console.error('[SetMap Fix] setMap调用出错:', error);
                    // 不抛出异常，防止应用崩溃
                    return;
                }
            };
            
            console.log('[SetMap Fix] Google Maps Marker.setMap方法已修复');
            
            // 扩展到其他可能有setMap方法的类
            const classesToFix = [
                'Circle', 'Rectangle', 'Polygon', 'Polyline', 
                'InfoWindow', 'GroundOverlay', 'KmlLayer'
            ];
            
            classesToFix.forEach(function(className) {
                if (window.google.maps[className] && 
                    window.google.maps[className].prototype.setMap) {
                    
                    const originalClassSetMap = window.google.maps[className].prototype.setMap;
                    
                    window.google.maps[className].prototype.setMap = function(map) {
                        try {
                            // 检查参数有效性
                            if (map !== null && 
                                (!map || 
                                 typeof map !== 'object' || 
                                 (typeof map.getDiv !== 'function' && typeof map.getStreetView !== 'function'))) {
                                
                                console.warn(`[SetMap Fix] ${className}: 检测到无效的地图对象`);
                                
                                // 针对undefined参数的特殊处理
                                if (map === undefined) {
                                    return originalClassSetMap.call(this, null);
                                }
                                
                                // 尝试获取全局地图对象
                                if (window.map && 
                                    typeof window.map === 'object' && 
                                    typeof window.map.getDiv === 'function') {
                                    
                                    return originalClassSetMap.call(this, window.map);
                                }
                                
                                // 最坏情况下，忽略调用
                                return;
                            }
                            
                            // 如果参数有效或为null，调用原始方法
                            return originalClassSetMap.call(this, map);
                        } catch (error) {
                            console.error(`[SetMap Fix] ${className}.setMap调用出错:`, error);
                            // 不抛出异常，防止应用崩溃
                            return;
                        }
                    };
                    
                    console.log(`[SetMap Fix] Google Maps ${className}.setMap方法已修复`);
                }
            });
        } catch (error) {
            console.error('[SetMap Fix] 修复Google Maps setMap方法时出错:', error);
        }
    }
    
    // 暴露公共方法
    window.GoogleMapsSetMapFix = {
        applyFix: applySetMapFix
    };
})(); 