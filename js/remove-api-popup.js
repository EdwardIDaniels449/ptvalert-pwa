/**
 * 移除API诊断弹出窗口脚本
 * 这个脚本在页面加载时会查找并移除API模式显示弹出窗口
 */

(function() {
    // 立即执行部分，不等待DOMContentLoaded
    // 阻止api-mode-display.js加载
    blockScript('js/api-mode-display.js');
    
    // 在DOMContentLoaded时执行
    document.addEventListener('DOMContentLoaded', removePopup);
    
    // 在 load 事件时也执行一次
    window.addEventListener('load', removePopup);
    
    // 延迟多次执行，确保彻底移除
    setTimeout(removePopup, 100);
    setTimeout(removePopup, 500);
    setTimeout(removePopup, 1000);
    setTimeout(removePopup, 2000);
    
    // 主要的移除函数
    function removePopup() {
        console.log('[彻底移除弹窗] 开始查找和移除API诊断弹窗...');
        
        // 直接移除弹窗元素
        removeElementById('debugOutput');
        
        // 移除状态元素
        removeElementById('apiModeStatus');
        
        // 移除可能包含状态元素的父容器
        document.querySelectorAll('div').forEach(div => {
            if (div.innerHTML && div.innerHTML.includes('API模式:')) {
                console.log('[彻底移除弹窗] 找到包含API模式文本的div，移除中...');
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                    console.log('[彻底移除弹窗] 成功移除包含API模式文本的div');
                }
            }
        });
        
        // 使用MutationObserver监视DOM变化，移除可能后续添加的元素
        setupMutationObserver();
        
        // 覆盖掉js/api-mode-display.js中的函数，防止它再添加元素
        overrideApiDisplayFunctions();
    }
    
    // 按ID移除元素
    function removeElementById(id) {
        const element = document.getElementById(id);
        if (element) {
            console.log(`[彻底移除弹窗] 找到ID为${id}的元素，移除中...`);
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                console.log(`[彻底移除弹窗] 成功移除ID为${id}的元素`);
            }
            return true;
        }
        return false;
    }
    
    // 阻止脚本加载
    function blockScript(scriptSrc) {
        const originalCreateElement = document.createElement;
        
        // 覆盖createElement方法来拦截script创建
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(document, tagName);
            
            if (tagName.toLowerCase() === 'script') {
                // 监听src属性设置
                const originalSetAttribute = element.setAttribute;
                element.setAttribute = function(name, value) {
                    if (name === 'src' && value && value.includes(scriptSrc)) {
                        console.log(`[彻底移除弹窗] 拦截到创建脚本: ${value}`);
                        // 替换src为空白脚本
                        return originalSetAttribute.call(this, 'src', 'data:text/javascript,console.log("[已阻止] ' + scriptSrc + '");');
                    }
                    return originalSetAttribute.call(this, name, value);
                };
            }
            
            return element;
        };
        
        // 移除已存在的脚本
        document.addEventListener('DOMContentLoaded', function() {
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].src && scripts[i].src.includes(scriptSrc)) {
                    console.log(`[彻底移除弹窗] 移除已加载的脚本: ${scripts[i].src}`);
                    if (scripts[i].parentNode) {
                        scripts[i].parentNode.removeChild(scripts[i]);
                    }
                }
            }
        });
    }
    
    // 设置DOM变化观察器
    function setupMutationObserver() {
        // 如果已经有观察器，不重复创建
        if (window._apiPopupObserver) return;
        
        // 创建一个新的观察器
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // 检查新增的节点
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        
                        // 检查是否是元素节点
                        if (node.nodeType === 1) {
                            // 检查是否是调试输出div
                            if (node.id === 'debugOutput') {
                                console.log('[彻底移除弹窗] 监测到新增的debugOutput元素，移除中...');
                                node.parentNode.removeChild(node);
                            }
                            
                            // 检查是否包含API模式文本
                            if (node.innerHTML && node.innerHTML.includes('API模式:')) {
                                console.log('[彻底移除弹窗] 监测到新增的包含API模式文本的元素，移除中...');
                                node.parentNode.removeChild(node);
                            }
                        }
                    }
                }
            });
        });
        
        // 配置观察器
        observer.observe(document, {
            childList: true,     // 观察子节点的添加或删除
            subtree: true,       // 观察整个子树
            attributes: false,   // 不观察属性变化
            characterData: false // 不观察文本内容变化
        });
        
        // 保存观察器引用
        window._apiPopupObserver = observer;
        console.log('[彻底移除弹窗] DOM变化观察器已设置');
    }
    
    // 覆盖api-mode-display.js中的关键函数
    function overrideApiDisplayFunctions() {
        // 确保全局对象存在
        window._overrideComplete = window._overrideComplete || false;
        
        // 避免重复覆盖
        if (window._overrideComplete) return;
        
        // 添加CSS规则来隐藏弹窗
        const style = document.createElement('style');
        style.textContent = `
            #debugOutput, [id="debugOutput"] { 
                display: none !important; 
                visibility: hidden !important; 
                opacity: 0 !important;
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
        
        window._overrideComplete = true;
        console.log('[彻底移除弹窗] API显示函数已覆盖，并添加了CSS规则');
    }
})(); 