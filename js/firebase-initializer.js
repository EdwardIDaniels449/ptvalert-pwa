// Firebase 初始化脚本
// 恢复自早期版本，确保页面可用

(function() {
    // Firebase 配置
    var firebaseConfig = {
        apiKey: "AIzaSyA41pAi6PZ7qQ8xrLbTg65Y6pcZBYMpLmY",
        authDomain: "ptvalert-19ea4.firebaseapp.com",
        databaseURL: "https://ptvalert-19ea4-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "ptvalert-19ea4",
        storageBucket: "ptvalert-19ea4.appspot.com",
        messagingSenderId: "590126951854",
        appId: "1:590126951854:web:4cbc14144b0a395dc42c3f"
    };
    
    // 检查Firebase是否已加载
    if (typeof firebase !== 'undefined') {
        // 检查是否已初始化
        if (firebase.apps && firebase.apps.length === 0) {
            try {
                firebase.initializeApp(firebaseConfig);
                console.log('[Firebase] 已初始化');
        } catch (error) {
                console.error('[Firebase] 初始化失败:', error);
            }
        } else {
            console.log('[Firebase] 已经初始化过');
        }
    } else {
        console.error('[Firebase] Firebase SDK未加载');
    }

    // 提供一个模拟的身份验证状态，不实际进行登录
    window.getFirebaseAuth = function() {
        // 返回一个模拟的身份验证对象，该对象总是处于"已登录"状态
        return {
            currentUser: {
                uid: 'anonymous-user',
                displayName: '匿名用户',
                email: 'anonymous@example.com'
            },
            onAuthStateChanged: function(callback) {
                // 立即调用回调，模拟已登录状态
                if (callback) {
                    setTimeout(function() {
                        callback({
                            uid: 'anonymous-user',
                            displayName: '匿名用户',
                            email: 'anonymous@example.com'
                        });
                    }, 0);
                }
                return function() {}; // 返回空函数作为解除监听器
            },
            signOut: function() {
                return Promise.resolve(); // 返回一个已解决的Promise
            }
        };
    };
})(); 