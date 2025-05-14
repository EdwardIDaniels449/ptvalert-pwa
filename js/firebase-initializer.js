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
    if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('[Firebase] 已初始化');
    }
})(); 