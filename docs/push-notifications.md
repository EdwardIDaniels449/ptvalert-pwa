# 推送通知配置文档

本项目使用Web Push API实现推送通知功能，允许即使在浏览器关闭时也能向用户发送地图标记更新通知。

## VAPID密钥配置

项目使用VAPID（Voluntary Application Server Identification）密钥对来验证推送服务请求。

- 公钥已配置在 `js/notification-handler.js` 文件中
- 私钥应保密存储在服务器环境变量中，不要直接硬编码或提交到代码仓库

## 服务器端配置

在服务器端实现推送通知时，需要以下配置：

```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:项目联系邮箱@example.com',  // 更改为真实联系邮箱
  process.env.VAPID_PUBLIC_KEY,      // 从环境变量读取公钥
  process.env.VAPID_PRIVATE_KEY      // 从环境变量读取私钥
);
```

## 客户端实现

- 客户端订阅逻辑位于 `js/notification-handler.js`
- 支持离线存储和后台同步功能
- 通知点击会根据标记数据导航到相应页面

## 更新记录

- **2025-05-13**: 更新了VAPID公钥以支持推送通知功能 