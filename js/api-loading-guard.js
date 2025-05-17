/**
 * Google Maps API 加载守卫
 * 在页面最早阶段运行，设置全局变量，防止重复加载 Google Maps API
 * 版本: 1.0.2
 */

(function() {
    console.log('[API守卫] 初始化 - 版本1.0.2');
    
    // 定义全局状态变量
    window.GOOGLE_MAPS_LOADING = window.GOOGLE_MAPS_LOADING || false;
    window.GOOGLE_MAPS_LOADED = window.GOOGLE_MAPS_LOADED || !!(window.google && window.google.maps);
    window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
    
    // 固定API版本以避免版本冲突
    const API_VERSION = 'weekly';
    const API_LIBRARIES = 'places';
    
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
                
                // 确保使用async参数
                if(!script.async) {
                    console.log('[API守卫] 添加async属性');
                    script.async = true; 
                }
                
                // 保证使用一致的API版本
                var enhancedSrc = enhanceApiUrl(script.src);
                if (enhancedSrc !== script.src) {
                    console.log('[API守卫] 优化API URL:', enhancedSrc);
                    script.src = enhancedSrc;
                }
                
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
    
    // 优化API URL，确保使用一致的版本和参数
    function enhanceApiUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        try {
            // 解析URL
            const urlObj = new URL(url);
            
            // 设置必要参数
            if (!urlObj.searchParams.has('v') || urlObj.searchParams.get('v') !== API_VERSION) {
                urlObj.searchParams.set('v', API_VERSION);
            }
            
            if (!urlObj.searchParams.has('libraries') || !urlObj.searchParams.get('libraries').includes(API_LIBRARIES)) {
                const currentLibs = urlObj.searchParams.get('libraries') || '';
                if (currentLibs) {
                    // 确保不重复添加libraries
                    const libsArray = currentLibs.split(',');
                    if (!libsArray.includes(API_LIBRARIES)) {
                        libsArray.push(API_LIBRARIES);
                        urlObj.searchParams.set('libraries', libsArray.join(','));
                    }
                } else {
                    urlObj.searchParams.set('libraries', API_LIBRARIES);
                }
            }
            
            // 确保使用loading=async参数
            if (!urlObj.searchParams.has('loading')) {
                urlObj.searchParams.set('loading', 'async');
            }
            
            return urlObj.toString();
        } catch (e) {
            console.error('[API守卫] URL增强失败:', e);
            return url;
        }
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
            
            // 监控iframe创建
            if (tagName.toLowerCase() === 'iframe') {
                element.addEventListener('load', function() {
                    try {
                        // 为iframe也添加守卫
                        injectGuardToIframe(element);
                    } catch(e) {
                        console.error('[API守卫] 注入iframe守卫失败:', e);
                    }
                });
            }
            
            return element;
        };
    }
    
    // 注入守卫到iframe
    function injectGuardToIframe(iframe) {
        try {
            if (!iframe.contentDocument || !iframe.contentWindow) {
                return;
            }
            
            console.log('[API守卫] 为iframe注入守卫');
            
            // 与主窗口共享状态
            iframe.contentWindow.GOOGLE_MAPS_LOADING = window.GOOGLE_MAPS_LOADING;
            iframe.contentWindow.GOOGLE_MAPS_LOADED = window.GOOGLE_MAPS_LOADED;
            iframe.contentWindow.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS;
            
            // 注入主要拦截函数到iframe
            var iframeDoc = iframe.contentDocument;
            
            // 拦截document.write
            patchDocumentWriteInContext(iframe.contentWindow, iframe.contentDocument);
            
            // 监视iframe中的script创建
            var scriptCreateObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.tagName && node.tagName.toLowerCase() === 'script') {
                            if (node.src && node.src.includes('maps.googleapis.com/maps/api/js')) {
                                console.warn('[API守卫] 阻止iframe中的Maps API加载:', node.src);
                                
                                // 提取回调
                                var callbackMatch = node.src.match(/callback=([^&]+)/);
                                if (callbackMatch && callbackMatch[1] && iframe.contentWindow[callbackMatch[1]]) {
                                    window.GOOGLE_MAPS_CALLBACKS.push(iframe.contentWindow[callbackMatch[1]]);
                                }
                                
                                // 阻止加载
                                node.src = "data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ=";
                                node.type = "disabled/javascript";
                            }
                        }
                    });
                });
            });
            
            // 开始监视iframe文档
            scriptCreateObserver.observe(iframeDoc, {
                childList: true,
                subtree: true
            });
            
        } catch(e) {
            console.error('[API守卫] 处理iframe失败:', e);
        }
    }
    
    // 监控已有的iframe
    function monitorExistingIframes() {
        var iframes = document.querySelectorAll('iframe');
        iframes.forEach(function(iframe) {
            try {
                if (iframe.contentDocument) {
                    injectGuardToIframe(iframe);
                }
            } catch(e) {
                // 可能由于跨域限制无法访问iframe内容
                console.log('[API守卫] 无法访问iframe内容:', e.message);
            }
        });
    }
    
    // 为特定上下文拦截document.write方法
    function patchDocumentWriteInContext(windowContext, docContext) {
        if (!windowContext || !docContext) return;
        
        var originalWrite = docContext.write;
        var originalWriteln = docContext.writeln;
        
        docContext.write = function(markup) {
            if (typeof markup === 'string' && markup.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止通过document.write加载Maps API');
                
                // 提取回调
                var callbackMatch = markup.match(/callback=([^&"']+)/);
                if (callbackMatch && callbackMatch[1] && windowContext[callbackMatch[1]]) {
                    console.log('[API守卫] 从document.write捕获回调:', callbackMatch[1]);
                    window.GOOGLE_MAPS_CALLBACKS.push(windowContext[callbackMatch[1]]);
                    
                    // 如果API已加载，执行回调
                    if (window.GOOGLE_MAPS_LOADED) {
                        setTimeout(function() {
                            try {
                                windowContext[callbackMatch[1]]();
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
            return originalWrite.call(docContext, markup);
        };
        
        docContext.writeln = function(markup) {
            if (typeof markup === 'string' && markup.includes('maps.googleapis.com/maps/api/js')) {
                console.warn('[API守卫] 阻止通过document.writeln加载Maps API');
                markup = markup.replace(/(https?:)?\/\/maps\.googleapis\.com\/maps\/api\/js[^"']+["']/g, 
                                      "'data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ='");
            }
            return originalWriteln.call(docContext, markup);
        };
    }
    
    // 拦截主文档的document.write方法
    function patchDocumentWrite() {
        patchDocumentWriteInContext(window, document);
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
            
            // 确保async和版本参数
            var enhancedUrl = enhanceApiUrl(url);
            if (enhancedUrl !== url) {
                console.log('[API守卫] 优化API URL:', enhancedUrl);
                url = enhancedUrl;
            }
            
            // 确保async属性
            element.async = true;
            
            // 在脚本加载完成后设置状态
            element.onload = function() {
                console.log('[API守卫] Google Maps API 加载完成');
                handleAPILoaded();
            };
            
            element.onerror = function() {
                console.error('[API守卫] Google Maps API 加载失败');
                window.GOOGLE_MAPS_LOADING = false;
            };
            
            // 返回增强后的URL
            return url;
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
                console.log('[API守卫] 没有找到加载器，创建脚本加载API');
                // 自行加载API
                var script = document.createElement('script');
                script.async = true;
                script.src = enhanceApiUrl('https://maps.googleapis.com/maps/api/js?key=AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U&callback=googleMapsAPILoaded');
                
                // 设置回调
                window.googleMapsAPILoaded = function() {
                    console.log('[API守卫] 自加载API完成');
                    handleAPILoaded();
                };
                
                document.head.appendChild(script);
            }
        });
    }
    
    // 如果iframe中尝试加载API，拦截postMessage请求
    function patchPostMessage() {
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
    
    // 设置MutationObserver监控整个文档的iframe创建
    function setupIframeObserver() {
        if (!window.MutationObserver) return;
        
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    // 检查是否是iframe
                    if (node.tagName && node.tagName.toLowerCase() === 'iframe') {
                        node.addEventListener('load', function() {
                            injectGuardToIframe(node);
                        });
                    }
                });
            });
        });
        
        // 开始监视文档
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
    
    // 运行守卫功能
    // 首先检查并阻止现有脚本
    blockExistingScripts();
    
    // 处理现有iframe
    monitorExistingIframes();
    
    // 设置iframe监控
    setupIframeObserver();
    
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