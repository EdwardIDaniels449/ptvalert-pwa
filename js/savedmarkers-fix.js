/**
 * SavedMarkers Fix Script (v1.0.0)
 * 用于修复savedMarkers数据格式和错误
 */

(function() {
    console.log('[Markers Fix] 标记数据修复脚本已加载 v1.0.0');
    
    // 立即执行修复
    fixSavedMarkers();
    
    // 在页面完全加载后再次执行修复
    document.addEventListener('DOMContentLoaded', function() {
        fixSavedMarkers();
    });
    
    // 在地图就绪后尝试修复
    document.addEventListener('map_ready', function() {
        fixSavedMarkers();
    });
    
    // 主要修复函数
    function fixSavedMarkers() {
        console.log('[Markers Fix] 开始修复标记数据...');
        
        try {
            // 获取标记数据
            const storedMarkers = localStorage.getItem('savedMarkers');
            if (!storedMarkers) {
                console.log('[Markers Fix] 本地存储中没有标记数据，创建示例标记');
                createSampleMarkers();
                return;
            }
            
            try {
                // 解析数据
                const markerData = JSON.parse(storedMarkers);
                console.log('[Markers Fix] 成功解析savedMarkers数据');
                
                // 验证数据格式
                if (!Array.isArray(markerData)) {
                    console.error('[Markers Fix] 标记数据不是数组，重置数据');
                    localStorage.removeItem('savedMarkers');
                    createSampleMarkers();
                    return;
                }
                
                // 检查并修复每个标记
                let needsUpdate = false;
                const fixedMarkers = markerData.filter(marker => {
                    // 过滤掉null和undefined
                    if (!marker) return false;
                    
                    // 必须是对象
                    if (typeof marker !== 'object') return false;
                    
                    // 确保必要字段存在
                    if (!marker.description) {
                        marker.description = '无描述';
                        needsUpdate = true;
                    }
                    
                    // 修复位置对象
                    if (!marker.location) {
                        // 创建默认位置
                        marker.location = {
                            lat: -37.8136, 
                            lng: 144.9631
                        };
                        needsUpdate = true;
                    } else if (typeof marker.location !== 'object') {
                        // 位置不是对象，重置
                        marker.location = {
                            lat: -37.8136, 
                            lng: 144.9631
                        };
                        needsUpdate = true;
                    } else {
                        // 确保lat和lng属性存在且为数字
                        if (typeof marker.location.lat === 'undefined' || marker.location.lat === null) {
                            marker.location.lat = -37.8136;
                            needsUpdate = true;
                        } else if (typeof marker.location.lat === 'string') {
                            marker.location.lat = parseFloat(marker.location.lat);
                            needsUpdate = true;
                        }
                        
                        if (typeof marker.location.lng === 'undefined' || marker.location.lng === null) {
                            marker.location.lng = 144.9631;
                            needsUpdate = true;
                        } else if (typeof marker.location.lng === 'string') {
                            marker.location.lng = parseFloat(marker.location.lng);
                            needsUpdate = true;
                        }
                    }
                    
                    // 确保id存在
                    if (!marker.id) {
                        marker.id = 'marker-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                        needsUpdate = true;
                    }
                    
                    return true;
                });
                
                // 如果有修改或过滤，保存回本地存储
                if (needsUpdate || fixedMarkers.length !== markerData.length) {
                    console.log(`[Markers Fix] 修复了标记数据，原始数量: ${markerData.length}, 修复后: ${fixedMarkers.length}`);
                    localStorage.setItem('savedMarkers', JSON.stringify(fixedMarkers));
                } else {
                    console.log('[Markers Fix] 标记数据格式正确，不需要修复');
                }
                
                // 如果没有标记，创建示例标记
                if (fixedMarkers.length === 0) {
                    console.log('[Markers Fix] 没有有效标记，创建示例标记');
                    createSampleMarkers();
                }
            } catch (parseError) {
                console.error('[Markers Fix] 解析标记数据失败:', parseError);
                
                // 清除损坏的数据
                localStorage.removeItem('savedMarkers');
                
                // 创建示例标记
                createSampleMarkers();
            }
        } catch (e) {
            console.error('[Markers Fix] 修复标记数据时出错:', e);
        }
    }
    
    // 创建示例标记数据
    function createSampleMarkers() {
        try {
            console.log('[Markers Fix] 创建示例标记数据');
            
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
            console.log('[Markers Fix] 已创建示例标记数据');
            
            return true;
        } catch (e) {
            console.error('[Markers Fix] 创建示例标记数据失败:', e);
            return false;
        }
    }
    
    // 暴露函数到全局空间
    window.MarkersFixUtils = {
        fixSavedMarkers: fixSavedMarkers,
        createSampleMarkers: createSampleMarkers
    };
})(); 