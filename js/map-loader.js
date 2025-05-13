/**
 * 地图加载辅助脚本
 * 确保Google Maps API正确加载和初始化
 */

(function() {
    // 检查Google Maps是否已加载的变量
    let checkCount = 0;
    const maxChecks = 10;
    
    // 当DOM完全加载后执行
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[地图加载器] DOM已加载，准备初始化地图');
        
        // 检查地图容器元素
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('[地图加载器] 找不到地图容器元素!');
            // 创建地图容器
            createMapContainer();
            return;
        }
        
        // 确保地图容器有正确的样式
        ensureMapStyles(mapElement);
        
        // 开始检查Google Maps API
        checkGoogleMapsAPI();
    });
    
    // 确保地图容器样式正确
    function ensureMapStyles(mapElement) {
        mapElement.style.width = '100%';
        mapElement.style.height = '100vh';
        mapElement.style.position = 'absolute';
        mapElement.style.top = '0';
        mapElement.style.left = '0';
        mapElement.style.zIndex = '1';
        mapElement.style.backgroundColor = '#f5f5f5';
        
        console.log('[地图加载器] 已确保地图容器样式正确');
    }
    
    // 创建地图容器
    function createMapContainer() {
        console.log('[地图加载器] 创建地图容器元素');
        const mapDiv = document.createElement('div');
        mapDiv.id = 'map';
        ensureMapStyles(mapDiv);
        
        // 插入到body的最前面
        if (document.body.firstChild) {
            document.body.insertBefore(mapDiv, document.body.firstChild);
        } else {
            document.body.appendChild(mapDiv);
        }
    }
    
    // 检查Google Maps API是否已加载
    function checkGoogleMapsAPI() {
        if (checkCount >= maxChecks) {
            console.error('[地图加载器] 尝试加载Google Maps API失败，已达到最大尝试次数');
            // 显示错误信息给用户
            showMapLoadError();
            return;
        }
        
        console.log('[地图加载器] 检查Google Maps API，尝试次数: ' + (checkCount + 1));
        
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            // Google Maps API未加载，尝试加载
            console.log('[地图加载器] Google Maps API未加载，尝试加载');
            loadGoogleMapsScript();
            
            // 延迟再次检查
            checkCount++;
            setTimeout(checkGoogleMapsAPI, 1000);
        } else {
            console.log('[地图加载器] Google Maps API已加载');
            
            // 检查地图是否已初始化
            if (typeof window.map === 'undefined' || !window.map) {
                console.log('[地图加载器] 地图未初始化，尝试初始化');
                
                // 调用initMap
                if (typeof window.initMap === 'function') {
                    try {
                        window.initMap();
                        console.log('[地图加载器] 地图已成功初始化');
                    } catch (error) {
                        console.error('[地图加载器] 初始化地图时出错:', error);
                        // 延迟再次尝试
                        checkCount++;
                        setTimeout(checkGoogleMapsAPI, 1000);
                    }
                } else {
                    console.error('[地图加载器] initMap函数不存在');
                    // 尝试创建我们自己的地图初始化函数
                    createMapInitFunction();
                }
            } else {
                console.log('[地图加载器] 地图已初始化');
            }
        }
    }
    
    // 加载Google Maps脚本
    function loadGoogleMapsScript() {
        // 检查是否已存在相同的脚本
        const existingScripts = document.getElementsByTagName('script');
        for (let i = 0; i < existingScripts.length; i++) {
            if (existingScripts[i].src.includes('maps.googleapis.com/maps/api/js')) {
                console.log('[地图加载器] Google Maps API脚本已存在，不再重复加载');
                return;
            }
        }
        
        // 创建新的脚本元素
        const script = document.createElement('script');
        script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=googleMapsLoadedCallback&libraries=places,visualization&v=weekly";
        script.async = true;
        script.defer = true;
        
        // 添加错误处理
        script.onerror = function() {
            console.error('[地图加载器] 加载Google Maps API失败');
            showMapLoadError();
        };
        
        // 将脚本添加到文档中
        document.body.appendChild(script);
        console.log('[地图加载器] 已添加Google Maps API脚本');
    }
    
    // 创建地图初始化函数
    function createMapInitFunction() {
        console.log('[地图加载器] 创建自定义地图初始化函数');
        
        // 定义墨尔本中心坐标
        const MELBOURNE_CENTER = {lat: -37.8136, lng: 144.9631};
        
        // 创建全局initMap函数
        window.initMap = function() {
            console.log('[地图加载器] 自定义initMap函数被调用');
            
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error('[地图加载器] 找不到地图容器元素');
                return;
            }
            
            // 创建地图
            window.map = new google.maps.Map(mapElement, {
                center: MELBOURNE_CENTER,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                fullscreenControl: false,
                streetViewControl: false
            });
            
            // 添加一个测试标记
            new google.maps.Marker({
                position: MELBOURNE_CENTER,
                map: window.map,
                title: "墨尔本中心"
            });
            
            console.log('[地图加载器] 地图已通过自定义函数初始化');
        };
        
        // 尝试调用initMap
        try {
            window.initMap();
        } catch (error) {
            console.error('[地图加载器] 调用自定义initMap函数失败:', error);
        }
    }
    
    // 显示地图加载错误
    function showMapLoadError() {
        // 创建错误消息元素
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.backgroundColor = 'rgba(255, 59, 48, 0.9)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.maxWidth = '80%';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.zIndex = '9999';
        
        errorDiv.innerHTML = `
            <h3 style="margin-top:0">地图加载失败</h3>
            <p>无法加载Google地图，请检查您的网络连接或刷新页面重试。</p>
            <button onclick="location.reload()" style="background-color:white;color:#ff3b30;border:none;padding:8px 16px;border-radius:5px;font-weight:bold;cursor:pointer;margin-top:10px;">刷新页面</button>
        `;
        
        document.body.appendChild(errorDiv);
    }
})(); 