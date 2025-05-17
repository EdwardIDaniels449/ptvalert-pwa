/**
 * Google Maps API 域名密钥管理器
 * 版本: 1.0.0
 * 
 * 这个脚本用于解决 ApiProjectMapError 问题
 * 它会根据网站域名自动选择适当的API密钥
 */
(function() {
  console.log('[域名密钥管理] 初始化中...');
  
  // 域名->API密钥映射表
  const domainApiKeys = {
    // 本地测试域名
    'localhost': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U',
    '127.0.0.1': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U',
    
    // GitHub Pages 域名
    'edwardidaniels449.github.io': 'AIzaSyBSOYTUZ1MIc_TisEGTubKH6815WLIXbFM', // 用户提供的真实密钥
    
    // 生产域名，如果有的话
    'ptvalert.com': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U',
    'www.ptvalert.com': 'AIzaSyCE-oMIlcnOeqplgMmL9y1qcU6A9-HBu9U',
    
    // 默认密钥
    'default': 'AIzaSyBSOYTUZ1MIc_TisEGTubKH6815WLIXbFM'
  };
  
  // 获取当前域名
  const currentDomain = window.location.hostname;
  console.log('[域名密钥管理] 当前域名:', currentDomain);
  
  // 根据域名选择API密钥
  const selectedApiKey = domainApiKeys[currentDomain] || domainApiKeys['default'];
  console.log('[域名密钥管理] 已为此域名选择API密钥');
  
  // 拦截并修改所有加载Google Maps API的请求
  function patchApiRequests() {
    // 拦截 document.createElement
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(document, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        const originalSetAttribute = element.setAttribute;
        
        // 拦截 setAttribute
        element.setAttribute = function(name, value) {
          if (name === 'src' && value && typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
            // 替换API密钥
            try {
              const url = new URL(value);
              url.searchParams.set('key', selectedApiKey);
              value = url.toString();
              console.log('[域名密钥管理] 已替换API密钥');
            } catch (e) {
              console.error('[域名密钥管理] 替换API密钥失败:', e);
            }
          }
          
          return originalSetAttribute.call(this, name, value);
        };
        
        // 拦截 src 属性设置
        const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
        if (srcDescriptor && srcDescriptor.set) {
          Object.defineProperty(element, 'src', {
            get: srcDescriptor.get,
            set: function(value) {
              if (value && typeof value === 'string' && value.includes('maps.googleapis.com/maps/api/js')) {
                // 替换API密钥
                try {
                  const url = new URL(value);
                  url.searchParams.set('key', selectedApiKey);
                  value = url.toString();
                  console.log('[域名密钥管理] 已替换src属性API密钥');
                } catch (e) {
                  console.error('[域名密钥管理] 替换src属性API密钥失败:', e);
                }
              }
              
              return srcDescriptor.set.call(this, value);
            },
            configurable: true,
            enumerable: true
          });
        }
      }
      
      return element;
    };
  }
  
  // 检查是否已有API修复脚本
  if (typeof window.GOOGLE_MAPS_LOADED !== 'undefined') {
    console.log('[域名密钥管理] 检测到API修复脚本，配置密钥');
    window.FORCE_API_KEY = true;
    window.GOOGLE_MAPS_API_KEY = selectedApiKey;
  } else {
    console.log('[域名密钥管理] 未检测到API修复脚本，应用请求补丁');
    patchApiRequests();
  }
  
  // 导出API密钥供其他脚本使用
  window.MAPS_API_KEY_FOR_DOMAIN = selectedApiKey;
  
  // 告诉页面我们已准备好
  document.dispatchEvent(new CustomEvent('api_key_ready', { 
    detail: { apiKey: selectedApiKey } 
  }));
  
  console.log('[域名密钥管理] 初始化完成');
})(); 