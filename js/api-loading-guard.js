/**
 * Google Maps API 加载守卫
 * 在页面最早阶段运行，设置全局变量，防止重复加载 Google Maps API
 * 版本: 1.0.1
 */

(function() {
    console.log('[API守卫] 初始化 - 版本1.0.1');
    
    // 定义全局状态变量
    window.GOOGLE_MAPS_LOADING = window.GOOGLE_MAPS_LOADING || false;
    window.GOOGLE_MAPS_LOADED = window.GOOGLE_MAPS_LOADED || !!(window.google && window.google.maps);
    window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
    
    console.log('[API守卫] 当前状态: ' + 
        (window.GOOGLE_MAPS_LOADED ? '已加载' : 
        (window.GOOGLE_MAPS_LOADING ? '正在加载' : '未加载')));

    // 监听并阻止已存在的script标签
    function blockExistingScripts() {
        // 立即检查并阻止页面上已经存在的Google Maps scripts
        var existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
        console.log('[API守卫] 检测到 ' + existingScripts.length + ' 个现有地图脚本');
        
        existingScripts.forEach(function(script, index) {
            // 如果不是第一个地图脚本而且API已经在加载中，阻止它加载
            if ((index > 0 || window.GOOGLE_MAPS_LOADING || window.GOOGLE_MAPS_LOADED) && 
                script.src && script.src.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止现有脚本:', script.src);
                
                // 提取回调名
                var callbackMatch = script.src.match(/callback=([^&]+)/);
                if (callbackMatch && callbackMatch[1] && window[callbackMatch[1]]) {
                    var callbackName = callbackMatch[1];
                    console.log('[API守卫] 捕获回调:', callbackName);
                    window.GOOGLE_MAPS_CALLBACKS.push(window[callbackName]);
                }
                
                // 防止脚本继续加载
                script.src = "data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ="; // 空脚本
                script.type = "disabled/javascript";
            } else if (index === 0 && !window.GOOGLE_MAPS_LOADING && !window.GOOGLE_MAPS_LOADED) {
                // 如果这是第一个脚本，允许它加载
                console.log('[API守卫] 允许首个地图脚本加载:', script.src);
                window.GOOGLE_MAPS_LOADING = true;
                
                // 添加加载完成事件
                script.addEventListener('load', function() {
                    console.log('[API守卫] 首个地图脚本加载完成');
                    window.GOOGLE_MAPS_LOADING = false;
                    window.GOOGLE_MAPS_LOADED = true;
                    handleAPILoaded();
                });
                
                script.addEventListener('error', function() {
                    console.error('[API守卫] 首个地图脚本加载失败');
                    window.GOOGLE_MAPS_LOADING = false;
                });
            }
        });
    }
    
    // 拦截直接script标签加载 - 使用更强大的拦截方法
    function patchDocumentCreateElement() {
        // 保存原始方法
        var originalCreateElement = document.createElement;
        
        // 替换方法
        document.createElement = function(tagName) {
            var element = originalCreateElement.call(document, tagName);
            
            // 只关注script元素
            if (tagName.toLowerCase() === 'script') {
                // 拦截直接属性设置
                var originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
                        handleScriptSrcChange(element, value);
                        // 如果决定阻止，不调用原始方法
                        if (element._blocked) {
                            console.warn('[API守卫] 阻止通过setAttribute设置的Maps API:', value);
                            return;
                        }
                    }
                    
                    // 调用原始方法
                    return originalSetAttribute.call(this, name, value);
                };
                
                // 拦截直接src属性设置
                var srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                var originalSrcSetter = srcDescriptor.set;
                
                Object.defineProperty(element, 'src', {
                    set: function(value) {
                        if (typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
                            handleScriptSrcChange(element, value);
                            // 如果决定阻止，不调用原始setter
                            if (element._blocked) {
                                console.warn('[API守卫] 阻止通过src属性设置的Maps API:', value);
                                return;
                            }
                        }
                        // 调用原始setter
                        return originalSrcSetter.call(this, value);
                    },
                    get: srcDescriptor.get,
                    configurable: true
                });
            }
            
            return element;
        };
    }
    
    // 拦截文档write方法，防止通过document.write插入脚本
    function patchDocumentWrite() {
        var originalWrite = document.write;
        var originalWriteln = document.writeln;
        
        document.write = function(markup) {
            if (typeof markup === 'string' && markup.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止通过document.write加载Maps API');
                
                // 提取回调
                var callbackMatch = markup.match(/callback=([^&"']+)/);
                if (callbackMatch && callbackMatch[1] && window[callbackMatch[1]]) {
                    console.log('[API守卫] 从document.write捕获回调:', callbackMatch[1]);
                    window.GOOGLE_MAPS_CALLBACKS.push(window[callbackMatch[1]]);
                    
                    // 如果API已加载，执行回调
                    if (window.GOOGLE_MAPS_LOADED) {
                        setTimeout(function() {
                            try {
                                window[callbackMatch[1]]();
                            } catch(e) {
                                console.error('[API守卫] 执行回调失败:', e);
                            }
                        }, 100);
                    }
                }
                
                // 阻止API加载但保留其他内容
                markup = markup.replace(/(https?:)?\/\/maps\.googleapis\.com\/maps\/api\/js[^"']+["']/g, 
                                      "'data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ='");
            }
            return originalWrite.call(this, markup);
        };
        
        document.writeln = function(markup) {
            if (typeof markup === 'string' && markup.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止通过document.writeln加载Maps API');
                markup = markup.replace(/(https?:)?\/\/maps\.googleapis\.com\/maps\/api\/js[^"']+["']/g, 
                                      "'data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ='");
            }
            return originalWriteln.call(this, markup);
        };
    }
    
    // 处理脚本src变化的通用方法
    function handleScriptSrcChange(element, url) {
        // 如果API已加载或正在加载，阻止重复加载
        if (window.GOOGLE_MAPS_LOADED || window.GOOGLE_MAPS_LOADING) {
            console.warn('[API守卫] 阻止重复加载 Google Maps API:', url);
            
            // 提取回调函数名称
            var callbackMatch = url.match(/callback=([^&]+)/);
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
            
            // 标记元素为已阻止，并阻止它加载真正的脚本
            element._blocked = true;
            
            // 使用空白脚本替换
            return "data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ=";
        } else {
            // 设置状态为正在加载
            window.GOOGLE_MAPS_LOADING = true;
            console.log('[API守卫] 允许加载 Google Maps API');
            
            // 在脚本加载完成后设置状态
            element.onload = function() {
                console.log('[API守卫] Google Maps API 加载完成');
                handleAPILoaded();
            };
            
            element.onerror = function() {
                console.error('[API守卫] Google Maps API 加载失败');
                window.GOOGLE_MAPS_LOADING = false;
            };
        }
    }
    
    // 当API加载完成时处理
    function handleAPILoaded() {
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
        
        // 触发API加载事件
        document.dispatchEvent(new CustomEvent('google_maps_loaded'));
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
    
    // 如果iframe中尝试加载API，拦截postMessage请求
    function patchPostMessage() {
        var originalPostMessage = window.postMessage;
        
        // 只在非iframe环境中拦截
        if (window === window.top) {
            window.addEventListener('message', function(event) {
                // 检查message是否包含maps API加载请求
                if (event.data && typeof event.data === 'string' && event.data.includes('maps.googleapis.com/maps/api/js')) {
                    console.warn('[API守卫] 检测到postMessage中的Maps API请求');
                    // 阻止处理这种消息
                }
            }, true); // 使用捕获模式
        }
    }
    
    // 防止全局eval/Function注入API
    function patchGlobalEval() {
        var originalEval = window.eval;
        window.eval = function(code) {
            if (typeof code === 'string' && code.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止通过eval加载Maps API');
                
                // 移除所有API加载代码
                code = code.replace(/(\w+\.)?document\.createElement\(['"]script['"]\)[^;]*maps\.googleapis\.com[^;]*;/g, '');
                code = code.replace(/(\w+\.)?loadScript\([^)]*maps\.googleapis\.com[^)]*\)/g, 'true');
                code = code.replace(/src\s*=\s*(['"])https?:\/\/maps\.googleapis\.com[^'"]*\1/g, 'src="data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ="');
            }
            return originalEval.call(window, code);
        };
        
        // 监控动态函数创建
        var originalFunction = window.Function;
        window.Function = function() {
            var args = Array.prototype.slice.call(arguments);
            var body = args.pop();
            
            if (typeof body === 'string' && body.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止通过Function构造函数加载Maps API');
                body = body.replace(/(\w+\.)?document\.createElement\(['"]script['"]\)[^;]*maps\.googleapis\.com[^;]*;/g, '');
                body = body.replace(/(\w+\.)?loadScript\([^)]*maps\.googleapis\.com[^)]*\)/g, 'true');
                body = body.replace(/src\s*=\s*(['"])https?:\/\/maps\.googleapis\.com[^'"]*\1/g, 'src="data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ="');
                args.push(body);
            } else {
                args.push(body);
            }
            
            return originalFunction.apply(this, args);
        };
    }
    
    // 处理JSONP回调
    function handleJSONPCallbacks() {
        // 检查页面上的全局变量，查找JSONP回调
        for (var key in window) {
            if (key.indexOf('gm_authFailure') !== -1 || 
                key.indexOf('google') !== -1 || 
                key.indexOf('map') !== -1) {
                
                // 跳过普通对象和已知函数
                if (typeof window[key] !== 'function' || 
                    key === 'googleMapsAPILoaded' || 
                    key === 'google') {
                    continue;
                }
                
                var funcStr = window[key].toString();
                // 检测可能的回调函数
                if (funcStr.indexOf('maps') !== -1 || 
                    funcStr.indexOf('google') !== -1 || 
                    funcStr.indexOf('Map') !== -1) {
                    
                    console.log('[API守卫] 可能的JSONP回调:', key);
                    window.GOOGLE_MAPS_CALLBACKS.push(window[key]);
                }
            }
        }
    }
    
    // 运行守卫功能
    // 首先检查并阻止现有脚本
    blockExistingScripts();
    
    // 然后添加各种拦截
    patchDocumentCreateElement();
    patchDocumentWrite();
    patchPostMessage();
    patchGlobalEval();
    setupEventListeners();
    
    // 预处理JSONP回调
    setTimeout(handleJSONPCallbacks, 500);
    
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