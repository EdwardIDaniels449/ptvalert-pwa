/**
 * Google Maps API 加载修复脚本
 * 放置在网站<head>部分的最早位置
 * 版本: 1.0.0
 */
(function() {
  console.log('[API修复] 初始化中...');
  
  // 定义全局状态变量
  window.GOOGLE_MAPS_LOADING = window.GOOGLE_MAPS_LOADING || false;
  window.GOOGLE_MAPS_LOADED = window.GOOGLE_MAPS_LOADED || !!(window.google && window.google.maps);
  window.GOOGLE_MAPS_CALLBACKS = window.GOOGLE_MAPS_CALLBACKS || [];
  
  // API配置
  const API_VERSION = 'weekly';
  const API_LIBRARIES = 'places';
  const API_KEY = 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U'; // 使用网站原有的key
  
  // 获取当前状态
  console.log('[API修复] 当前状态: ' + 
    (window.GOOGLE_MAPS_LOADED ? '已加载' : 
    (window.GOOGLE_MAPS_LOADING ? '正在加载' : '未加载')));

  // 监听并阻止重复的script标签
  function blockExistingScripts() {
    var existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    console.log('[API修复] 检测到 ' + existingScripts.length + ' 个地图脚本');
    
    existingScripts.forEach(function(script, index) {
      // 如果不是第一个地图脚本或API已经在加载中，阻止它加载
      if ((index > 0 || window.GOOGLE_MAPS_LOADING || window.GOOGLE_MAPS_LOADED) && 
        script.src && script.src.includes('maps.googleapis.com/maps/api/js')) {
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
      } else if (index === 0 && !window.GOOGLE_MAPS_LOADING && !window.GOOGLE_MAPS_LOADED) {
        // 如果这是第一个脚本，允许它加载
        console.log('[API修复] 允许首个地图脚本加载');
        script.async = true; 
        window.GOOGLE_MAPS_LOADING = true;
        
        // 添加加载完成事件
        script.addEventListener('load', function() {
          console.log('[API修复] 地图脚本加载完成');
          handleAPILoaded();
        });
        
        script.addEventListener('error', function() {
          console.error('[API修复] 地图脚本加载失败');
          window.GOOGLE_MAPS_LOADING = false;
        });
      }
    });
  }

  // 当API加载完成时处理
  function handleAPILoaded() {
    window.GOOGLE_MAPS_LOADING = false;
    window.GOOGLE_MAPS_LOADED = true;
    
    // 执行所有回调
    if (window.GOOGLE_MAPS_CALLBACKS && window.GOOGLE_MAPS_CALLBACKS.length) {
      console.log('[API修复] 执行', window.GOOGLE_MAPS_CALLBACKS.length, '个待处理回调');
      window.GOOGLE_MAPS_CALLBACKS.forEach(function(callback) {
        try {
          if (typeof callback === 'function') {
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
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + API_KEY + 
                '&libraries=' + API_LIBRARIES + 
                '&v=' + API_VERSION + 
                '&callback=googleMapsAPILoaded';
    
    // 设置回调
    window.googleMapsAPILoaded = function() {
      console.log('[API修复] Google Maps API 加载成功!');
      handleAPILoaded();
    };
    
    document.head.appendChild(script);
  });
  
  // 修复特定错误
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = typeof args[0] === 'string' ? args[0] : '';
    
    // 检查是否包含目标错误消息
    if (message.includes('Google Maps API未正确加载')) {
      console.log('[API修复] 捕获到错误消息，尝试修复...');
      
      // 如果API未加载，触发加载请求
      if (!window.GOOGLE_MAPS_LOADED && !window.GOOGLE_MAPS_LOADING) {
        document.dispatchEvent(new CustomEvent('request_google_maps_api'));
        return; // 不输出原始错误
      }
    }
    
    // 对于其他错误，正常输出
    originalConsoleError.apply(console, args);
  };
  
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
                typeof window[key].createMap === 'function') {
              console.log('[API修复] 找到潜在的地图控制器:', key);
              
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