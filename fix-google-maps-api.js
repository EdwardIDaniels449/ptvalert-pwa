/**
 * Google Maps API 加载修复脚本
 * 放置在网站<head>部分的最早位置
 * 版本: 1.2.0
 */
(function() {
  console.log('[API修复] 初始化中...');
  
  // 定义全局状态变量
  window.GOOGLE_MAPS_LOADING = window.GOOGLE_MAPS_LOADING || false;
  window.GOOGLE_MAPS_LOADED = window.GOOGLE_MAPS_LOADED || !!(window.google && window.google.maps);
  window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
  window.GOOGLE_MAPS_BLOCKED_COUNT = 0;
  window.FORCE_API_KEY = true; // 始终替换API密钥
  
  // API配置 - 可以通过域名密钥管理器脚本进行覆盖
  const API_VERSION = 'weekly';
  const API_LIBRARIES = 'places';
  
  // 首先检查是否已通过域名密钥管理器设置API密钥
  window.GOOGLE_MAPS_API_KEY = window.MAPS_API_KEY_FOR_DOMAIN || 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U';
  
  // 获取域名对应的API密钥
  function getDomainAPIKey() {
    // 获取当前域名
    const domain = window.location.hostname;
    
    // 域名映射表
    const keyMap = {
      // 本地测试域名
      'localhost': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U',
      '127.0.0.1': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U',
      
      // GitHub Pages 域名 - 使用允许在GitHub Pages上使用的API密钥
      'edwardidaniels449.github.io': 'AIzaSyDkY7g-iL9zGxx2JFssL_KmAxK-HZFD-uA', // 请更换为您自己的密钥
      
      // 默认密钥
      'default': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U'
    };
    
    console.log('[API修复] 当前域名:', domain);
    return keyMap[domain] || keyMap['default'];
  }
  
  // 如果没有通过域名密钥管理器设置，则自动获取
  if (!window.MAPS_API_KEY_FOR_DOMAIN) {
    window.GOOGLE_MAPS_API_KEY = getDomainAPIKey();
  }
  
  console.log('[API修复] 使用API密钥匹配当前域名: ' + window.location.hostname);
  
  // 获取当前状态
  console.log('[API修复] 当前状态: ' + 
    (window.GOOGLE_MAPS_LOADED ? '已加载' : 
    (window.GOOGLE_MAPS_LOADING ? '正在加载' : '未加载')));

  // 优化API URL，确保使用一致的版本和参数
  function enhanceApiUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    try {
      // 解析URL
      const urlObj = new URL(url);
      
      // 设置必要参数
      if (!urlObj.searchParams.has('v')) {
        urlObj.searchParams.set('v', API_VERSION);
      }
      
      if (!urlObj.searchParams.has('libraries')) {
        urlObj.searchParams.set('libraries', API_LIBRARIES);
      }
      
      // 强制使用特定API key以解决ApiProjectMapError
      if (window.FORCE_API_KEY && window.GOOGLE_MAPS_API_KEY) {
        urlObj.searchParams.set('key', window.GOOGLE_MAPS_API_KEY);
        console.log('[API修复] 已替换API密钥为域名专用密钥');
      }
      
      // 确保使用loading=async参数
      if (!urlObj.searchParams.has('loading')) {
        urlObj.searchParams.set('loading', 'async');
      }
      
      return urlObj.toString();
    } catch (e) {
      console.error('[API修复] URL增强失败:', e);
      return url;
    }
  }

  // 监听并阻止重复的script标签
  function blockExistingScripts() {
    var existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    console.log('[API修复] 检测到 ' + existingScripts.length + ' 个地图脚本');
    
    let allowedScript = null;
    
    // 第一轮：阻止所有非主要脚本
    existingScripts.forEach(function(script, index) {
      // 如果API已经加载，阻止所有新脚本
      if (window.GOOGLE_MAPS_LOADED) {
        console.warn('[API修复] 阻止重复脚本 (API已加载):', script.src);
        script.src = "data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ="; // 空脚本
        script.type = "disabled/javascript";
        window.GOOGLE_MAPS_BLOCKED_COUNT++;
        
        // 提取回调名
        var callbackMatch = script.src.match(/callback=([^&]+)/);
        if (callbackMatch && callbackMatch[1] && window[callbackMatch[1]]) {
          var callbackName = callbackMatch[1];
          console.log('[API修复] 捕获回调:', callbackName);
          window.GOOGLE_MAPS_CALLBACKS.push(window[callbackMatch[1]]);
        }
        return;
      }
      
      // 找到第一个有效的script作为主脚本
      if (!allowedScript && script.src && script.src.includes('maps.googleapis.com/maps/api/js')) {
        allowedScript = script;
      } else if (script.src && script.src.includes('maps.googleapis.com/maps/api/js')) {
        // 其他所有脚本都被阻止
        console.warn('[API修复] 阻止重复脚本:', script.src);
        
        // 提取回调名
        var callbackMatch = script.src.match(/callback=([^&]+)/);
        if (callbackMatch && callbackMatch[1] && window[callbackMatch[1]]) {
          var callbackName = callbackMatch[1];
          console.log('[API修复] 捕获回调:', callbackName);
          window.GOOGLE_MAPS_CALLBACKS.push(window[callbackMatch[1]]);
        }
        
        // 防止脚本继续加载
        script.src = "data:text/javascript;base64,Ly8gQmxvY2tlZCBieSBBUEkgZ3VhcmQ="; // 空脚本
        script.type = "disabled/javascript";
        window.GOOGLE_MAPS_BLOCKED_COUNT++;
      }
    });
    
    // 第二轮：处理允许的主脚本
    if (allowedScript && !window.GOOGLE_MAPS_LOADING && !window.GOOGLE_MAPS_LOADED) {
      console.log('[API修复] 允许主要地图脚本加载（已优化）');
      
      // 备份原始回调
      var originalCallback = null;
      var callbackMatch = allowedScript.src.match(/callback=([^&]+)/);
      if (callbackMatch && callbackMatch[1]) {
        originalCallback = window[callbackMatch[1]];
      }
      
      // 优化URL
      var enhancedSrc = enhanceApiUrl(allowedScript.src);
      if (enhancedSrc !== allowedScript.src) {
        console.log('[API修复] 替换API URL:', enhancedSrc);
        allowedScript.src = enhancedSrc;
      }
      
      // 标记为正在加载
      window.GOOGLE_MAPS_LOADING = true;
      
      // 添加加载完成事件
      allowedScript.addEventListener('load', function() {
        console.log('[API修复] 地图脚本加载完成');
        handleAPILoaded();
        
        // 如果有原始回调，执行它
        if (originalCallback && typeof originalCallback === 'function') {
          try {
            console.log('[API修复] 执行原始回调');
            originalCallback();
          } catch (e) {
            console.error('[API修复] 执行原始回调出错:', e);
          }
        }
      });
      
      allowedScript.addEventListener('error', function(e) {
        console.error('[API修复] 地图脚本加载失败:', e);
        handleApiLoadError();
        window.GOOGLE_MAPS_LOADING = false;
      });
      
      // 确保脚本异步加载
      allowedScript.async = true;
    }
  }

  // 处理API加载错误
  function handleApiLoadError() {
    console.log('[API修复] 检测到API加载失败，尝试使用备用密钥');
    
    // 尝试使用备用API密钥
    if (!window._hasTriedBackupKey) {
      window._hasTriedBackupKey = true;
      window.GOOGLE_MAPS_API_KEY = 'AIzaSyDkY7g-iL9zGxx2JFssL_KmAxK-HZFD-uA'; // 备用密钥
      console.log('[API修复] 尝试使用备用密钥');
      
      // 重新触发API加载
      setTimeout(function() {
        document.dispatchEvent(new CustomEvent('request_google_maps_api'));
      }, 1000);
    }
  }

  // 当API加载完成时处理
  function handleAPILoaded() {
    window.GOOGLE_MAPS_LOADING = false;
    window.GOOGLE_MAPS_LOADED = true;
    
    // 检查API是否真的加载成功
    if (!window.google || !window.google.maps) {
      console.error('[API修复] API标记为已加载，但google.maps对象不存在');
      window.GOOGLE_MAPS_LOADED = false;
      handleApiLoadError();
      return;
    }
    
    // 执行所有回调
    if (window.GOOGLE_MAPS_CALLBACKS && window.GOOGLE_MAPS_CALLBACKS.length) {
      console.log('[API修复] 执行', window.GOOGLE_MAPS_CALLBACKS.length, '个待处理回调');
      window.GOOGLE_MAPS_CALLBACKS.forEach(function(callback) {
        try {
          if (typeof callback === 'function') {
            console.log('[API修复] 执行回调');
            callback();
          }
        } catch (e) {
          console.error('[API修复] 执行回调出错:', e);
        }
      });
      window.GOOGLE_MAPS_CALLBACKS = [];
    }
    
    // 触发API加载事件
    document.dispatchEvent(new CustomEvent('google_maps_loaded'));
  }

  // 拦截createElement以捕获动态创建的script标签
  var originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    var element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      var originalSetAttribute = element.setAttribute;
      
      // 拦截setAttribute
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
          if (window.GOOGLE_MAPS_LOADED || window.GOOGLE_MAPS_LOADING) {
            console.warn('[API修复] 阻止动态script设置地图API:', value);
            window.GOOGLE_MAPS_BLOCKED_COUNT++;
            
            // 提取回调
            var callbackMatch = value.match(/callback=([^&]+)/);
            if (callbackMatch && callbackMatch[1] && window[callbackMatch[1]]) {
              window.GOOGLE_MAPS_CALLBACKS.push(window[callbackMatch[1]]);
              
              // 立即执行回调（如果API已加载）
              if (window.GOOGLE_MAPS_LOADED && typeof window[callbackMatch[1]] === 'function') {
                setTimeout(function() {
                  try {
                    window[callbackMatch[1]]();
                  } catch(e) {
                    console.error('[API修复] 执行回调出错:', e);
                  }
                }, 0);
              }
            }
            
            return;
          } else {
            console.log('[API修复] 允许动态脚本加载（已优化）:', value);
            window.GOOGLE_MAPS_LOADING = true;
            
            // 替换为优化后的URL
            var enhancedUrl = enhanceApiUrl(value);
            if (enhancedUrl !== value) {
              value = enhancedUrl;
            }
            
            // 添加load事件监听
            element.addEventListener('load', function() {
              console.log('[API修复] 动态脚本加载完成');
              handleAPILoaded();
            });
            
            element.addEventListener('error', function(e) {
              console.error('[API修复] 动态脚本加载失败:', e);
              handleApiLoadError();
              window.GOOGLE_MAPS_LOADING = false;
            });
          }
        }
        
        return originalSetAttribute.call(this, name, value);
      };
      
      // 拦截src属性设置
      var srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src') || 
                         { configurable: true, enumerable: true };
      
      Object.defineProperty(element, 'src', {
        get: srcDescriptor.get || function() { return this.getAttribute('src'); },
        set: function(value) {
          if (typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
            if (window.GOOGLE_MAPS_LOADED || window.GOOGLE_MAPS_LOADING) {
              console.warn('[API修复] 阻止通过src属性设置地图API:', value);
              window.GOOGLE_MAPS_BLOCKED_COUNT++;
              return;
            } else {
              console.log('[API修复] 允许通过src属性加载地图API（已优化）');
              window.GOOGLE_MAPS_LOADING = true;
              
              // 替换为优化后的URL
              value = enhanceApiUrl(value);
              
              // 添加事件监听
              element.addEventListener('load', function() {
                handleAPILoaded();
              });
              
              element.addEventListener('error', function() {
                handleApiLoadError();
                window.GOOGLE_MAPS_LOADING = false;
              });
            }
          }
          
          if (srcDescriptor.set) {
            srcDescriptor.set.call(this, value);
          } else {
            this.setAttribute('src', value);
          }
        },
        configurable: true,
        enumerable: true
      });
    }
    
    return element;
  };

  // 监听API请求事件
  document.addEventListener('request_google_maps_api', function() {
    console.log('[API修复] 收到加载API请求');
    
    // 如果API已加载，触发加载完成事件
    if (window.GOOGLE_MAPS_LOADED) {
      console.log('[API修复] API已加载，触发完成事件');
      document.dispatchEvent(new CustomEvent('google_maps_loaded'));
      return;
    }
    
    // 如果API正在加载，不做任何事情
    if (window.GOOGLE_MAPS_LOADING) {
      console.log('[API修复] API正在加载，等待完成');
      return;
    }
    
    // 否则，发起加载
    window.GOOGLE_MAPS_LOADING = true;
    
    // 加载API
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + window.GOOGLE_MAPS_API_KEY + 
                '&libraries=' + API_LIBRARIES + 
                '&v=' + API_VERSION + 
                '&callback=googleMapsAPILoaded' +
                '&loading=async';
    
    // 设置回调
    window.googleMapsAPILoaded = function() {
      console.log('[API修复] Google Maps API 加载成功!');
      handleAPILoaded();
    };
    
    // 添加错误处理程序
    script.addEventListener('error', function() {
      console.error('[API修复] API加载失败');
      handleApiLoadError();
      window.GOOGLE_MAPS_LOADING = false;
    });
    
    document.head.appendChild(script);
  });
  
  // 监视并捕获ApiProjectMapError错误
  function setupApiErrorMonitoring() {
    // 拦截window.console.error
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.length > 0 ? String(args[0]) : '';
      
      // 检查是否包含目标错误消息
      if (message.includes('Google Maps API未正确加载') || 
          message.includes('ApiProjectMapError')) {
        console.log('[API修复] 捕获到错误消息，尝试修复...', message);
        
        // 如果是API密钥错误，尝试重新加载与其他密钥
        if (message.includes('ApiProjectMapError') && !window._hasTriedBackupKey) {
          console.log('[API修复] ApiProjectMapError - 尝试使用备用密钥重新加载');
          handleApiLoadError();
          return; // 不输出原始错误
        }
        
        // 如果API未加载，触发加载请求
        if (!window.GOOGLE_MAPS_LOADED && !window.GOOGLE_MAPS_LOADING) {
          document.dispatchEvent(new CustomEvent('request_google_maps_api'));
          return; // 不输出原始错误
        }
      }
      
      // 如果检测到多次加载的警告，不输出
      if (message.includes('You have included the Google Maps JavaScript API multiple times on this page')) {
        console.log('[API修复] 忽略多重加载警告');
        return;
      }
      
      // 对于其他错误，正常输出
      originalConsoleError.apply(console, args);
    };
    
    // 拦截全局错误
    window.addEventListener('error', function(event) {
      // 检查是否为地图API错误
      if (event && event.message && 
         (event.message.includes('ApiProjectMapError') || 
          event.message.includes('Google Maps API'))) {
        console.log('[API修复] 捕获全局API错误:', event.message);
        handleApiLoadError();
        
        // 阻止错误传播
        event.preventDefault();
        return false;
      }
    }, true);
  }
  
  // 在url-fix.js或app-connector.js中打补丁
  function patchAppConnector() {
    // 等待可能的app-connector模块加载
    setTimeout(function() {
      // 查找所有可能含有报错代码的对象
      for (var key in window) {
        try {
          if (typeof window[key] === 'object' && window[key] !== null) {
            // 检查是否有initMap或类似方法
            if (typeof window[key].initMap === 'function' || 
                typeof window[key].loadMap === 'function' ||
                typeof window[key].createMap === 'function' ||
                typeof window[key].checkMapsAPILoaded === 'function') {
              console.log('[API修复] 找到潜在的地图控制器:', key);
              
              // 替换错误报告方法
              if (typeof window[key].checkMapsAPILoaded === 'function') {
                const originalCheck = window[key].checkMapsAPILoaded;
                window[key].checkMapsAPILoaded = function() {
                  // 如果Maps API已加载，直接返回true
                  if (window.google && window.google.maps) {
                    return true;
                  }
                  
                  // 否则触发加载
                  document.dispatchEvent(new CustomEvent('request_google_maps_api'));
                  
                  // 调用原始方法并返回结果
                  return originalCheck.apply(this, arguments);
                };
                console.log('[API修复] 已替换 checkMapsAPILoaded 方法');
              }
              
              // 如果API已加载但应用未检测到
              if (window.google && window.google.maps) {
                if (typeof window[key].initMap === 'function') {
                  console.log('[API修复] 尝试调用 ' + key + '.initMap()');
                  try { window[key].initMap(); } catch (e) {}
                }
                if (typeof window[key].loadMap === 'function') {
                  console.log('[API修复] 尝试调用 ' + key + '.loadMap()');
                  try { window[key].loadMap(); } catch (e) {}
                }
                if (typeof window[key].createMap === 'function') {
                  console.log('[API修复] 尝试调用 ' + key + '.createMap()');
                  try { window[key].createMap(); } catch (e) {}
                }
              }
            }
          }
        } catch (e) {
          // 忽略访问错误
        }
      }
    }, 2000);
  }

  // 设置错误监控
  setupApiErrorMonitoring();

  // 页面加载后处理
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      blockExistingScripts();
      patchAppConnector();
    });
  } else {
    blockExistingScripts();
    patchAppConnector();
  }
  
  // 页面完全加载后自动触发API请求
  window.addEventListener('load', function() {
    console.log('[API修复] 页面加载完成，准备自动触发API加载');
    
    // 延迟一秒触发，给其他脚本时间初始化
    setTimeout(function() {
      if (!window.google || !window.google.maps) {
        console.log('[API修复] 自动触发API加载请求');
        document.dispatchEvent(new CustomEvent('request_google_maps_api'));
      }
    }, 1000);
  });
  
  console.log('[API修复] 初始化完成');
})(); 