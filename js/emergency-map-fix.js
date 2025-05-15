/**
 * 紧急地图修复脚本
 * 专门修复移动端确认键无响应问题和弹窗层级冲突问题
 */

(function() {
    console.log('[紧急修复] 应用移动端UI修复');
    
    // 添加全局紧急提交函数，确保内联onclick可以使用
    window.handleEmergencySubmit = function(event) {
        console.log('[紧急修复] 全局紧急提交函数被调用');
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        try {
            const description = document.getElementById('descriptionInput').value;
            
            if (!description) {
                alert(window.currentLang === 'zh' ? '请输入描述' : 'Please enter a description');
                return;
            }
            
            if (!window.selectedLocation) {
                alert(window.currentLang === 'zh' ? '请选择位置' : 'Please select a location');
                return;
            }
            
            // 关闭表单
            const reportForm = document.getElementById('reportForm');
            if (reportForm) {
                reportForm.style.transform = 'translateY(100%)';
                setTimeout(function() {
                    reportForm.style.display = 'none';
                }, 300);
            }
            
            // 获取图片数据
            const previewImg = document.getElementById('previewImg');
            const imageData = previewImg && previewImg.style.display !== 'none' ? previewImg.src : null;
            
            // 创建报告数据
            const reportData = {
                description: description,
                location: window.selectedLocation,
                image: imageData,
                timestamp: new Date().toISOString(),
                user: 'anonymous-user'
            };
            
            // 直接添加标记到地图
            if (window.map && typeof google === 'object' && google.maps) {
                // 确保markers数组已初始化
                if (!window.markers) {
                    window.markers = [];
                }
                
                // 创建标记
                const marker = new google.maps.Marker({
                    position: window.selectedLocation,
                    map: window.map,
                    animation: google.maps.Animation.DROP,
                    title: description,
                    label: {
                        text: '🐶',
                        fontSize: '24px'
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 0
                    },
                    optimized: false
                });
                
                // 保存标记
                window.markers.push(marker);
                
                // 为标记添加点击事件
                marker.addListener('click', function() {
                    // 关闭任何已打开的信息窗口
                    if (window.openedInfoWindow) {
                        window.openedInfoWindow.close();
                    }
                    
                    // 创建信息窗口内容，包括描述和可能的图片
                    let content = '<div style="padding:10px;max-width:300px;">';
                    
                    // 如果有图片，添加图片
                    if (imageData) {
                        content += `<div style="margin-bottom:10px;"><img src="${imageData}" style="max-width:100%;max-height:150px;border-radius:4px;"></div>`;
                    }
                    
                    // 添加描述
                    content += `<div style="font-size:14px;margin-bottom:10px;">${description}</div>`;
                    
                    // 添加时间戳
                    const now = new Date();
                    content += `<div style="font-size:12px;color:#666;">${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>`;
                    
                    content += '</div>';
                    
                    // 创建并打开信息窗口
                    const infoWindow = new google.maps.InfoWindow({
                        content: content,
                        maxWidth: 300
                    });
                    
                    infoWindow.open(window.map, marker);
                    
                    // 保存当前打开的信息窗口
                    window.openedInfoWindow = infoWindow;
                });
                
                // 尝试保存标记到localStorage
                try {
                    const markerData = window.markers.map(function(m) {
                        return {
                            lat: m.getPosition().lat(),
                            lng: m.getPosition().lng(),
                            description: m.getTitle() || '',
                            image: m === marker ? imageData : null
                        };
                    });
                    
                    localStorage.setItem('savedMarkers', JSON.stringify(markerData));
                    console.log('[紧急修复] 标记已保存到localStorage');
                } catch (error) {
                    console.error('[紧急修复] 保存标记到localStorage失败:', error);
                }
            } else {
                console.error('[紧急修复] 地图未初始化，无法添加标记');
            }
            
            // 显示成功弹窗
            const reportCounterPopup = document.getElementById('reportCounterPopup');
            if (reportCounterPopup) {
                reportCounterPopup.style.zIndex = '15000';
                reportCounterPopup.style.display = 'block';
                
                // 3秒后自动关闭
                setTimeout(function() {
                    reportCounterPopup.style.display = 'none';
                }, 3000);
            }
            
            console.log('[紧急修复] 紧急提交成功');
        } catch (error) {
            console.error('[紧急修复] 紧急提交失败:', error);
            alert(window.currentLang === 'zh' ? '提交失败，请重试' : 'Submission failed, please try again');
        }
    };
    
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[紧急修复] DOM已加载，准备应用修复');
        applyFixes();
        
        // 确保DOM加载后立即修复按钮
        setTimeout(fixSubmitButtonDirectly, 500);
        // 再次尝试修复，以防止其他脚本覆盖我们的修复
        setTimeout(fixSubmitButtonDirectly, 2000);
    });
    
    // 主修复函数
    function applyFixes() {
        fixPopupZIndexes();
        fixButtonEvents();
        fixReportSubmission();
        fixQuickAddForm();
        fixSubmitButtonDirectly(); // 直接修复提交按钮
        
        // 为安全起见，添加一个全局触摸事件处理程序
        document.addEventListener('touchstart', function() {
            // 触摸事件发生时不做任何事，仅确保触摸事件被正确注册
        }, false);
        
        // 监听表单打开事件，确保表单打开后按钮可点击
        const addReportBtn = document.getElementById('addReportBtn');
        if (addReportBtn) {
            addReportBtn.addEventListener('click', function() {
                // 延迟200ms修复提交按钮，确保表单已显示
                setTimeout(fixSubmitButtonDirectly, 200);
                // 再次延迟以确保修复生效
                setTimeout(fixSubmitButtonDirectly, 1000);
            });
        }
    }
    
    // 直接修复提交按钮的函数
    function fixSubmitButtonDirectly() {
        console.log('[紧急修复] 直接修复提交按钮');
        const submitReportBtn = document.getElementById('submitReport');
        
        if (submitReportBtn) {
            console.log('[紧急修复] 找到提交按钮，准备修复');
            
            // 检查按钮是否已经设置了内联onclick
            if (!submitReportBtn.hasAttribute('onclick')) {
                // 如果没有内联onclick，添加一个
                submitReportBtn.setAttribute('onclick', 'handleEmergencySubmit(event)');
                console.log('[紧急修复] 已添加内联onclick属性');
            }
            
            // 记录原始样式
            const originalStyle = submitReportBtn.getAttribute('style');
            
            // 移除现有事件监听器的最有效方法是克隆节点
            const newSubmitReportBtn = submitReportBtn.cloneNode(true);
            submitReportBtn.parentNode.replaceChild(newSubmitReportBtn, submitReportBtn);
            
            // 确保按钮样式正确
            newSubmitReportBtn.style.backgroundColor = '#0071e3';
            newSubmitReportBtn.style.color = 'white';
            newSubmitReportBtn.style.position = 'relative';
            newSubmitReportBtn.style.zIndex = '10000';
            newSubmitReportBtn.style.cursor = 'pointer';
            
            // 确保按钮有内容
            if (!newSubmitReportBtn.textContent || newSubmitReportBtn.textContent.trim() === '') {
                newSubmitReportBtn.textContent = window.currentLang === 'zh' ? '确定' : 'Submit';
            }
            
            // 无论是否有内联onclick，都添加直接的事件处理函数
            newSubmitReportBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[紧急修复] 确认按钮点击事件触发');
                window.handleEmergencySubmit(e);
                return false;
            };
            
            // 添加触摸事件
            newSubmitReportBtn.addEventListener('touchstart', function(e) {
                console.log('[紧急修复] 确认按钮触摸开始');
                this.style.backgroundColor = '#0058b0'; // 背景变暗以提供视觉反馈
            });
            
            newSubmitReportBtn.addEventListener('touchend', function(e) {
                console.log('[紧急修复] 确认按钮触摸结束');
                e.preventDefault();
                this.style.backgroundColor = '#0071e3'; // 恢复原背景色
                
                // 手动触发点击事件
                window.handleEmergencySubmit(e);
            });
            
            console.log('[紧急修复] 提交按钮修复完成');
        } else {
            console.log('[紧急修复] 未找到提交按钮，可能表单尚未打开');
        }
    }
    
    // 紧急提交函数 - 当其他提交方法都失败时使用
    function emergencySubmit() {
        console.log('[紧急修复] 执行紧急提交');
        window.handleEmergencySubmit(null);
    }
    
    // 紧急添加标记函数
    function addEmergencyMarker(location, description) {
        console.log('[紧急修复] 添加紧急标记:', location, description);
        
        if (!window.map || !window.google || !window.google.maps) {
            console.error('[紧急修复] 地图API未加载，无法添加标记');
            return;
        }
        
        try {
            // 确保markers数组已初始化
            if (!window.markers) {
                window.markers = [];
            }
            
            // 创建标记
            const marker = new google.maps.Marker({
                position: location,
                map: window.map,
                animation: google.maps.Animation.DROP,
                title: description,
                label: {
                    text: '🐶',
                    fontSize: '24px'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 0
                },
                optimized: false
            });
            
            // 保存标记
            window.markers.push(marker);
            
            // 添加点击事件
            marker.addListener('click', function() {
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding:10px;max-width:300px;">
                        <div style="font-size:14px;margin-bottom:10px;">${description}</div>
                        <div style="font-size:12px;color:#666;margin-top:5px;">${new Date().toLocaleString()}</div>
                    </div>`,
                    maxWidth: 300
                });
                
                infoWindow.open(window.map, marker);
            });
            
            console.log('[紧急修复] 紧急标记添加成功');
            
            // 尝试保存标记到localStorage
            try {
                const markerData = window.markers.map(function(m) {
                    return {
                        lat: m.getPosition().lat(),
                        lng: m.getPosition().lng(),
                        description: m.getTitle() || ''
                    };
                });
                
                localStorage.setItem('savedMarkers', JSON.stringify(markerData));
                console.log('[紧急修复] 标记已保存到localStorage');
            } catch (storageError) {
                console.error('[紧急修复] 保存标记到localStorage失败:', storageError);
            }
        } catch (error) {
            console.error('[紧急修复] 添加紧急标记失败:', error);
        }
    }
    
    // 修复弹窗层级
    function fixPopupZIndexes() {
        console.log('[紧急修复] 修复弹窗层级');
        
        // 设置弹窗层级关系
        const reportCounterPopup = document.getElementById('reportCounterPopup');
        const reportForm = document.getElementById('reportForm');
        const quickAddForm = document.getElementById('quickAddForm');
        
        if (reportCounterPopup) {
            reportCounterPopup.style.zIndex = '10000';
            
            // 确保弹窗中的按钮正确处理点击
            const closeBtn = reportCounterPopup.querySelector('button');
            if (closeBtn) {
                // 克隆并替换按钮以移除可能的事件处理程序
                const newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                
                // 添加事件处理程序
                newCloseBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[紧急修复] 关闭成功弹窗按钮被点击');
                    reportCounterPopup.style.display = 'none';
                    document.body.style.pointerEvents = 'auto';
                }, { passive: false });
            }
        }
        
        if (reportForm) {
            reportForm.style.zIndex = '5000';
        }
        
        if (quickAddForm) {
            quickAddForm.style.zIndex = '3000';
        }
    }
    
    // 修复按钮事件
    function fixButtonEvents() {
        console.log('[紧急修复] 修复按钮点击事件');
        
        // 修复快速添加确认按钮
        const submitQuickAddBtn = document.getElementById('submitQuickAdd');
        if (submitQuickAddBtn) {
            const newSubmitQuickAddBtn = submitQuickAddBtn.cloneNode(true);
            submitQuickAddBtn.parentNode.replaceChild(newSubmitQuickAddBtn, submitQuickAddBtn);
            
            newSubmitQuickAddBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[紧急修复] 快速添加确认按钮被点击');
                
                if (typeof window.submitQuickDescription === 'function') {
                    window.submitQuickDescription();
                }
            }, { passive: false });
            
            // 添加触摸事件
            newSubmitQuickAddBtn.addEventListener('touchend', function(e) {
                console.log('[紧急修复] 快速添加确认按钮触摸结束');
                if (typeof window.submitQuickDescription === 'function') {
                    window.submitQuickDescription();
                }
            }, { passive: true });
        }
    }
    
    // 修复报告提交功能
    function fixReportSubmission() {
        console.log('[紧急修复] 增强报告提交功能');
        
        // 备份原始函数
        const originalSubmitReportData = window.submitReportData || null;
        
        // 创建增强版本的submitReportData函数，直接使用handleEmergencySubmit
        window.submitReportDataEnhanced = window.handleEmergencySubmit;
        
        // 直接修改UIController中的函数
        if (window.UIController) {
            window.UIController.submitReportData = window.submitReportDataEnhanced;
        }
        
        // 设置全局函数版本
        window.submitReportData = window.submitReportDataEnhanced;
    }
    
    // 修复快速添加表单
    function fixQuickAddForm() {
        const quickAddForm = document.getElementById('quickAddForm');
        const quickAddClose = document.getElementById('quickAddClose');
        
        if (quickAddForm && quickAddClose) {
            // 替换关闭按钮
            const newQuickAddClose = quickAddClose.cloneNode(true);
            quickAddClose.parentNode.replaceChild(newQuickAddClose, quickAddClose);
            
            newQuickAddClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                quickAddForm.style.display = 'none';
            }, { passive: false });
            
            // 添加触摸事件
            newQuickAddClose.addEventListener('touchend', function(e) {
                quickAddForm.style.display = 'none';
            }, { passive: true });
            
            // 确保表单显示在正确位置
            quickAddForm.style.position = 'fixed';
            quickAddForm.style.top = '50%';
            quickAddForm.style.left = '50%';
            quickAddForm.style.transform = 'translate(-50%, -50%)';
            quickAddForm.style.zIndex = '3000';
        }
    }
})();