/**
 * 地图调试辅助工具
 * 显示地图状态和错误信息
 */

(function() {
    console.log('[Debug] 调试辅助工具加载');
    
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟执行，确保其他脚本已运行
        setTimeout(function() {
            analyzeMapState();
            createDebugPanel();
        }, 1000);
    });
    
    // 分析地图状态
    function analyzeMapState() {
        console.log('=== 地图系统状态分析 ===');
        
        // 检查Google Maps API
        const googleMapsLoaded = typeof google !== 'undefined' && typeof google.maps !== 'undefined';
        console.log('Google Maps API 加载状态:', googleMapsLoaded ? '已加载' : '未加载');
        
        // 检查地图对象
        const mapExists = typeof window.map !== 'undefined';
        console.log('地图对象状态:', mapExists ? '已创建' : '未创建');
        
        if (mapExists) {
            // 检查地图功能是否完整
            const hasSetCenter = typeof window.map.setCenter === 'function';
            const hasGetCenter = typeof window.map.getCenter === 'function';
            console.log('地图功能完整性:', hasSetCenter && hasGetCenter ? '完整' : '不完整');
            
            // 检查地图容器
            const mapElement = document.getElementById('map');
            if (mapElement) {
                const mapStyle = window.getComputedStyle(mapElement);
                console.log('地图容器可见性:', mapStyle.display, mapStyle.visibility, 'opacity:', mapStyle.opacity);
                console.log('地图容器尺寸:', mapStyle.width, 'x', mapStyle.height);
                console.log('地图容器位置:', mapStyle.position, 'z-index:', mapStyle.zIndex);
            } else {
                console.error('地图容器不存在!');
            }
        }
        
        // 检查关键函数是否存在
        console.log('initMap函数存在:', typeof window.initMap === 'function' ? '是' : '否');
        console.log('googleMapsLoadedCallback函数存在:', typeof window.googleMapsLoadedCallback === 'function' ? '是' : '否');
        console.log('addReportMarker函数存在:', typeof window.addReportMarker === 'function' ? '是' : '否');
        
        // 检查标记数组
        if (window.markers) {
            console.log('标记数组长度:', window.markers.length);
        } else {
            console.log('标记数组未初始化');
        }
        
        // 检查本地存储数据
        try {
            const storedMarkers = localStorage.getItem('savedMarkers');
            if (storedMarkers) {
                const markerData = JSON.parse(storedMarkers);
                console.log('本地存储标记数量:', markerData.length);
                
                // 输出第一个标记的信息（如果存在）
                if (markerData.length > 0) {
                    console.log('第一个标记示例:', markerData[0]);
                }
            } else {
                console.log('本地存储中没有标记数据');
            }
        } catch (e) {
            console.error('检查本地存储数据时出错:', e);
        }
        
        // 检查MapFix对象
        if (window.MapFix) {
            console.log('MapFix对象存在');
            
            // 如果地图未初始化，强制创建地图
            if (!mapExists && typeof window.MapFix.createBackupMap === 'function') {
                console.log('尝试强制创建备用地图...');
                try {
                    window.MapFix.createBackupMap();
                } catch (e) {
                    console.error('强制创建备用地图失败:', e);
                }
            }
            
            // 如果Google Maps API未加载，强制加载
            if (!googleMapsLoaded && typeof window.MapFix.forceLoadGoogleMapsAPI === 'function') {
                console.log('尝试强制加载Google Maps API...');
                try {
                    window.MapFix.forceLoadGoogleMapsAPI();
                } catch (e) {
                    console.error('强制加载Google Maps API失败:', e);
                }
            }
        } else {
            console.error('MapFix对象不存在!');
        }
        
        console.log('=== 分析完成 ===');
    }
    
    // 创建调试面板
    function createDebugPanel() {
        // 创建面板元素
        const panel = document.createElement('div');
        panel.id = 'mapDebugPanel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 5000;
            max-width: 300px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
        `;
        
        // 添加内容
        panel.innerHTML = `
            <h3 style="margin-top:0;font-size:16px;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.2);padding-bottom:5px;">地图调试面板</h3>
            <div id="debugMapInfo">加载中...</div>
            <div style="margin-top:10px;display:flex;gap:5px;">
                <button id="forceCreateMapBtn" style="flex:1;background:#0071e3;color:white;border:none;padding:8px;border-radius:5px;font-size:13px;cursor:pointer;">强制创建地图</button>
                <button id="reloadAPIBtn" style="flex:1;background:#34c759;color:white;border:none;padding:8px;border-radius:5px;font-size:13px;cursor:pointer;">重新加载API</button>
                <button id="hideDebugPanelBtn" style="background:#666;color:white;border:none;padding:5px;border-radius:5px;font-size:13px;cursor:pointer;margin-left:5px;">X</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 更新面板信息
        updateDebugPanel();
        
        // 添加按钮事件
        document.getElementById('forceCreateMapBtn').addEventListener('click', function() {
            if (window.MapFix && typeof window.MapFix.createBackupMap === 'function') {
                window.MapFix.createBackupMap();
                updateDebugPanel();
            } else {
                this.textContent = '无法创建';
                setTimeout(() => { this.textContent = '强制创建地图'; }, 2000);
            }
        });
        
        document.getElementById('reloadAPIBtn').addEventListener('click', function() {
            if (window.MapFix && typeof window.MapFix.forceLoadGoogleMapsAPI === 'function') {
                window.MapFix.forceLoadGoogleMapsAPI();
                updateDebugPanel();
            } else {
                this.textContent = '无法重载';
                setTimeout(() => { this.textContent = '重新加载API'; }, 2000);
            }
        });
        
        document.getElementById('hideDebugPanelBtn').addEventListener('click', function() {
            document.getElementById('mapDebugPanel').style.display = 'none';
        });
        
        // 定期更新面板信息
        setInterval(updateDebugPanel, 3000);
    }
    
    // 更新调试面板信息
    function updateDebugPanel() {
        const infoElement = document.getElementById('debugMapInfo');
        if (!infoElement) return;
        
        const googleMapsLoaded = typeof google !== 'undefined' && typeof google.maps !== 'undefined';
        const mapExists = typeof window.map !== 'undefined';
        const mapFunctional = mapExists && typeof window.map.setCenter === 'function';
        
        let html = `
            <div style="margin-bottom:5px;">Google Maps API: <span style="color:${googleMapsLoaded ? '#4CAF50' : '#F44336'}">${googleMapsLoaded ? '已加载' : '未加载'}</span></div>
            <div style="margin-bottom:5px;">地图对象: <span style="color:${mapExists ? '#4CAF50' : '#F44336'}">${mapExists ? '已创建' : '未创建'}</span></div>
            <div style="margin-bottom:5px;">地图功能: <span style="color:${mapFunctional ? '#4CAF50' : '#F44336'}">${mapFunctional ? '正常' : '异常'}</span></div>
            <div style="margin-bottom:5px;">标记: <span style="color:#FFC107">${window.markers ? window.markers.length : '0'}</span> 个</div>
        `;
        
        // 如果地图有问题，添加错误提示
        if (!googleMapsLoaded || !mapExists || !mapFunctional) {
            html += `
                <div style="margin-top:8px;padding:5px;background:rgba(244,67,54,0.2);border-radius:4px;">
                    <strong style="color:#F44336">问题检测:</strong><br>
                    ${!googleMapsLoaded ? '• Google Maps API未加载<br>' : ''}
                    ${!mapExists ? '• 地图对象未创建<br>' : ''}
                    ${!mapFunctional ? '• 地图功能异常<br>' : ''}
                    ${(!window.markers || window.markers.length === 0) ? '• 没有标记数据<br>' : ''}
                </div>
            `;
        }
        
        infoElement.innerHTML = html;
    }
    
    // 提供全局访问
    window.DebugHelper = {
        analyzeMapState: analyzeMapState,
        createDebugPanel: createDebugPanel
    };
})(); 