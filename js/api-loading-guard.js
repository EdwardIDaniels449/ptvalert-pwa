/**
 * Google Maps API 加载守卫
 * 在页面最早阶段运行，设置全局变量，防止重复加载 Google Maps API
 * 版本: 1.0.0
 */

(function() {
    console.log('[API守卫] 初始化');
    
    // 定义全局状态变量
    window.GOOGLE_MAPS_LOADING = window.GOOGLE_MAPS_LOADING || false;
    window.GOOGLE_MAPS_LOADED = window.GOOGLE_MAPS_LOADED || !!(window.google && window.google.maps);
    window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
    
    console.log('[API守卫] 当前状态: ' + 
        (window.GOOGLE_MAPS_LOADED ? '已加载' : 
        (window.GOOGLE_MAPS_LOADING ? '正在加载' : '未加载')));
    
    // 拦截直接script标签加载
    function patchDocumentCreateElement() {
        // 保存原始方法
        var originalCreateElement = document.createElement;
        
        // 替换方法
        document.createElement = function(tagName) {
            var element = originalCreateElement.call(document, tagName);
            
            // 只关注script元素
            if (tagName.toLowerCase() === 'script') {
                // 监听src属性的设置
                var originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
                        // 如果API已加载或正在加载，阻止重复加载
                        if (window.GOOGLE_MAPS_LOADED || window.GOOGLE_MAPS_LOADING) {
                            console.warn('[API守卫] 阻止重复加载 Google Maps API:', value);
                            
                            // 提取回调函数名称
                            var callbackMatch = value.match(/callback=([^&]+)/);
                            if (callbackMatch && callbackMatch[1]) {
                                var callbackName = callbackMatch[1];
                                
                                // 如果找到回调，添加到队列
                                if (window[callbackName] && typeof window[callbackName] === 'function') {
                                    console.log('[API守卫] 捕获回调:', callbackName);
                                    window.GOOGLE_MAPS_CALLBACKS.push(window[callbackName]);
                                }
                                
                                // 如果API已加载，立即执行回调
                                if (window.GOOGLE_MAPS_LOADED && window[callbackName]) {
                                    setTimeout(function() {
                                        try {
                                            console.log('[API守卫] 立即执行回调:', callbackName);
                                            window[callbackName]();
                                        } catch (e) {
                                            console.error('[API守卫] 执行回调出错:', e);
                                        }
                                    }, 100);
                                }
                            }
                            
                            // 阻止加载这个脚本
                            return;
                        } else {
                            // 设置状态为正在加载
                            window.GOOGLE_MAPS_LOADING = true;
                            console.log('[API守卫] 允许加载 Google Maps API');
                            
                            // 在脚本加载完成后设置状态
                            element.onload = function() {
                                console.log('[API守卫] Google Maps API 加载完成');
                                window.GOOGLE_MAPS_LOADING = false;
                                window.GOOGLE_MAPS_LOADED = true;
                                
                                // 执行所有回调
                                if (window.GOOGLE_MAPS_CALLBACKS && window.GOOGLE_MAPS_CALLBACKS.length) {
                                    console.log('[API守卫] 执行', window.GOOGLE_MAPS_CALLBACKS.length, '个待处理回调');
                                    window.GOOGLE_MAPS_CALLBACKS.forEach(function(callback) {
                                        try {
                                            if (typeof callback === 'function') {
                                                callback();
                                            }
                                        } catch (e) {
                                            console.error('[API守卫] 执行回调出错:', e);
                                        }
                                    });
                                    window.GOOGLE_MAPS_CALLBACKS = [];
                                }
                            };
                            
                            element.onerror = function() {
                                console.error('[API守卫] Google Maps API 加载失败');
                                window.GOOGLE_MAPS_LOADING = false;
                            };
                        }
                    }
                    
                    // 调用原始方法
                    return originalSetAttribute.call(this, name, value);
                };
            }
            
            return element;
        };
    }
    
    // 监听API请求事件
    function setupEventListeners() {
        document.addEventListener('request_google_maps_api', function(event) {
            console.log('[API守卫] 收到加载API请求');
            
            // 如果API已加载，触发加载完成事件
            if (window.GOOGLE_MAPS_LOADED) {
                console.log('[API守卫] API已加载，触发完成事件');
                document.dispatchEvent(new CustomEvent('google_maps_loaded'));
                return;
            }
            
            // 如果API正在加载，不做任何事情
            if (window.GOOGLE_MAPS_LOADING) {
                console.log('[API守卫] API正在加载，等待完成');
                return;
            }
            
            // 否则，发起加载
            if (window.MapIntegration && typeof window.MapIntegration.loadAPI === 'function') {
                console.log('[API守卫] 使用MapIntegration加载API');
                window.MapIntegration.loadAPI();
            } else {
                console.log('[API守卫] 没有找到加载器，等待其他脚本加载API');
            }
        });
    }
    
    // 运行守卫功能
    patchDocumentCreateElement();
    setupEventListeners();
    
    // 如果Google Maps已加载，发出通知
    if (window.google && window.google.maps) {
        window.GOOGLE_MAPS_LOADED = true;
        console.log('[API守卫] Google Maps已存在，发送加载完成事件');
        setTimeout(function() {
            document.dispatchEvent(new CustomEvent('google_maps_loaded'));
        }, 100);
    }
    
    console.log('[API守卫] 初始化完成');
})(); 