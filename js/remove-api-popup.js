/**
 * 移除API诊断弹出窗口脚本
 * 这个脚本在页面加载时会查找并移除API模式显示弹出窗口
 */

(function() {
    // 在DOMContentLoaded时执行
    window.addEventListener('DOMContentLoaded', function() {
        console.log('[移除弹窗] 开始查找API诊断弹窗...');
        
        // 移除JS/CSS加载
        removeScriptReference('js/api-mode-display.js');
        
        // 定时检查并移除弹窗
        checkAndRemovePopup();
        // 多次尝试以确保弹窗被移除
        setTimeout(checkAndRemovePopup, 500);
        setTimeout(checkAndRemovePopup, 1000);
        setTimeout(checkAndRemovePopup, 2000);
    });
    
    // 检查并移除弹窗
    function checkAndRemovePopup() {
        // 查找调试输出元素
        var debugOutput = document.getElementById('debugOutput');
        if (debugOutput) {
            console.log('[移除弹窗] 找到API诊断弹窗，正在移除...');
            debugOutput.parentNode.removeChild(debugOutput);
            console.log('[移除弹窗] API诊断弹窗已移除');
        }
        
        // 查找可能的API状态元素
        var apiModeStatus = document.getElementById('apiModeStatus');
        if (apiModeStatus && apiModeStatus.parentNode) {
            console.log('[移除弹窗] 找到API状态元素，正在移除父容器...');
            var container = apiModeStatus.parentNode;
            if (container.parentNode) {
                container.parentNode.removeChild(container);
                console.log('[移除弹窗] API状态容器已移除');
            }
        }
    }
    
    // 移除脚本引用
    function removeScriptReference(scriptSrc) {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src.indexOf(scriptSrc) !== -1) {
                console.log('[移除弹窗] 找到API模式显示脚本引用，正在移除...');
                scripts[i].parentNode.removeChild(scripts[i]);
                console.log('[移除弹窗] API模式显示脚本引用已移除');
                break;
            }
        }
    }
})(); 