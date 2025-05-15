/**
 * 紧急地图修复脚本
 * 专门修复移动端确认键无响应问题和弹窗层级冲突问题
 */

(function() {
    console.log('[紧急修复] 应用移动端UI修复');
    
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[紧急修复] DOM已加载，准备应用修复');
        applyFixes();
    });
    
    // 主修复函数
    function applyFixes() {
        fixPopupZIndexes();
        fixButtonEvents();
        fixReportSubmission();
        fixQuickAddForm();
        
        // 为安全起见，添加一个全局触摸事件处理程序
        document.addEventListener('touchstart', function() {
            // 触摸事件发生时不做任何事，仅确保触摸事件被正确注册
        }, false);
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
        
        // 修复确认按钮
        const submitReportBtn = document.getElementById('submitReport');
        if (submitReportBtn) {
            // 移除现有事件监听器并替换元素
            const newSubmitReportBtn = submitReportBtn.cloneNode(true);
            submitReportBtn.parentNode.replaceChild(newSubmitReportBtn, submitReportBtn);
            
            // 添加增强的事件监听器
            newSubmitReportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[紧急修复] 确认提交报告按钮被点击');
                
                // 确保UIController存在
                if (window.UIController && typeof window.UIController.submitReportData === 'function') {
                    try {
                        window.UIController.submitReportData();
                    } catch (error) {
                        console.error('[紧急修复] 调用UIController.submitReportData时出错:', error);
                        // 尝试直接调用全局函数
                        if (typeof submitReportData === 'function') {
                            submitReportData();
                        } else {
                            console.error('[紧急修复] 找不到submitReportData函数');
                            alert('提交失败，请重试');
                        }
                    }
                } else {
                    console.error('[紧急修复] UIController未定义或没有submitReportData方法');
                    // 尝试直接调用全局函数
                    if (typeof submitReportData === 'function') {
                        submitReportData();
                    } else {
                        console.error('[紧急修复] 找不到submitReportData函数');
                        alert('提交失败，请重试');
                    }
                }
            }, { passive: false });
            
            // 添加触摸事件以确保移动设备上的反应
            newSubmitReportBtn.addEventListener('touchstart', function(e) {
                console.log('[紧急修复] 确认按钮触摸开始');
                this.style.backgroundColor = '#0058b0'; // 背景变暗以提供视觉反馈
            }, { passive: true });
            
            newSubmitReportBtn.addEventListener('touchend', function(e) {
                console.log('[紧急修复] 确认按钮触摸结束');
                this.style.backgroundColor = '#0071e3'; // 恢复原背景色
                
                // 在触摸结束时也尝试触发提交
                if (window.UIController && typeof window.UIController.submitReportData === 'function') {
                    window.UIController.submitReportData();
                } else if (typeof submitReportData === 'function') {
                    submitReportData();
                }
            }, { passive: true });
        }
        
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
        
        // 创建增强版本的submitReportData函数
        window.submitReportDataEnhanced = function() {
            console.log('[紧急修复] 使用增强版提交报告数据功能');
            
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
                
                console.log('[紧急修复] 表单验证通过，准备提交数据');
                
                // 关闭表单
                const reportForm = document.getElementById('reportForm');
                if (reportForm) {
                    reportForm.style.transform = 'translateY(100%)';
                    setTimeout(function() {
                        reportForm.style.display = 'none';
                    }, 300);
                }
                
                // 创建报告数据
                const previewImg = document.getElementById('previewImg');
                const imageData = previewImg && previewImg.style.display !== 'none' ? previewImg.src : null;
                
                const reportData = {
                    description: description,
                    location: window.selectedLocation,
                    image: imageData,
                    timestamp: new Date().toISOString(),
                    user: 'anonymous-user'
                };
                
                // 直接添加标记到地图
                if (window.map && typeof google === 'object' && google.maps) {
                    try {
                        // 初始化标记数组
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
                        
                        window.markers.push(marker);
                        console.log('[紧急修复] 标记已添加到地图');
                        
                        // 为标记添加点击事件
                        marker.addListener('click', function() {
                            if (typeof window.showReportDetails === 'function') {
                                window.showReportDetails({
                                    id: 'marker-' + Date.now(),
                                    location: window.selectedLocation,
                                    description: description,
                                    time: new Date().toISOString(),
                                    emoji: '🐶'
                                });
                            }
                        });
                        
                        // 保存标记到本地存储
                        if (typeof saveMarkersToStorage === 'function') {
                            saveMarkersToStorage();
                        }
                    } catch (error) {
                        console.error('[紧急修复] 添加标记时出错:', error);
                    }
                } else {
                    console.warn('[紧急修复] Google Maps API未加载，无法添加标记');
                }
                
                // 显示成功弹窗
                setTimeout(function() {
                    const reportCounterPopup = document.getElementById('reportCounterPopup');
                    if (reportCounterPopup) {
                        // 设置最高层级
                        reportCounterPopup.style.zIndex = '10000';
                        reportCounterPopup.style.display = 'block';
                        
                        // 更新计数
                        try {
                            // 更新报告计数
                            if (typeof updateReportCounter === 'function') {
                                updateReportCounter();
                            }
                        } catch (error) {
                            console.error('[紧急修复] 更新报告计数时出错:', error);
                        }
                        
                        // 3秒后自动关闭
                        setTimeout(function() {
                            reportCounterPopup.style.display = 'none';
                        }, 3000);
                    }
                }, 500);
                
                // 尝试异步保存到Firebase
                setTimeout(function() {
                    if (typeof firebase !== 'undefined' && firebase.database) {
                        try {
                            const reportRef = firebase.database().ref('reports').push();
                            reportRef.set(reportData)
                                .then(function() {
                                    console.log('[紧急修复] 报告已成功保存到Firebase');
                                })
                                .catch(function(error) {
                                    console.error('[紧急修复] 保存到Firebase失败:', error);
                                    // 尝试保存到localStorage作为备份
                                    if (typeof saveReportToLocalStorage === 'function') {
                                        saveReportToLocalStorage(reportData);
                                    }
                                });
                        } catch (error) {
                            console.error('[紧急修复] Firebase操作失败:', error);
                            // 尝试保存到localStorage作为备份
                            if (typeof saveReportToLocalStorage === 'function') {
                                saveReportToLocalStorage(reportData);
                            }
                        }
                    } else {
                        console.log('[紧急修复] Firebase不可用，使用localStorage');
                        // 尝试保存到localStorage
                        if (typeof saveReportToLocalStorage === 'function') {
                            saveReportToLocalStorage(reportData);
                        }
                    }
                }, 1000);
                
                // 重置状态
                window.selectedLocation = null;
                if (window.selectionMarker) {
                    window.selectionMarker.setMap(null);
                    window.selectionMarker = null;
                }
                
                if (window.selectionCircle) {
                    window.selectionCircle.setMap(null);
                    window.selectionCircle = null;
                }
                
                console.log('[紧急修复] 报告提交完成');
            } catch (error) {
                console.error('[紧急修复] 提交报告时出错:', error);
                alert('提交失败，请重试');
                
                // 尝试调用原始函数
                if (originalSubmitReportData) {
                    console.log('[紧急修复] 尝试调用原始submitReportData函数');
                    originalSubmitReportData();
                }
            }
        };
        
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