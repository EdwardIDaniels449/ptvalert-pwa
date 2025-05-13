# PtvAlert Web Application

一个基于地图的实时信息交互与分享平台，专为墨尔本地区用户设计。

A real-time, map-based information sharing platform designed for Melbourne residents and visitors.

## 项目概述 / Project Overview

PtvAlert 是一个让用户在地图上标记和共享实时信息的 Web 应用程序。用户可以标记交通状况、社区活动、安全警报等信息，并与其他用户实时分享。该应用支持离线使用、推送通知和多语言支持。

PtvAlert is a web application that allows users to mark and share real-time information on a map. Users can mark traffic conditions, community events, safety alerts, and more, sharing them with others in real-time. The app supports offline use, push notifications, and multiple languages.

## 主要特性 / Key Features

- 📍 **地图标记** - 在地图上添加、查看和共享位置标记
- 🔄 **实时数据同步** - 使用 Firebase 实时数据库进行信息同步
- 🌐 **多端兼容** - 响应式设计，支持桌面和移动设备
- 🔌 **离线功能** - 支持离线查看和创建待上传的标记
- 🔔 **推送通知** - 接收重要更新和附近事件的通知
- 🌍 **多语言支持** - 支持中文和英文界面
- 🔄 **双重存储** - 支持 Firebase 和 Cloudflare KV 存储，实现数据冗余备份
- 📱 **PWA 支持** - 可作为桌面/手机应用安装

## 技术栈 / Tech Stack

- 前端：HTML, CSS, JavaScript (原生)
- 地图 API：Google Maps JavaScript API
- 实时数据库：Firebase Realtime Database
- 存储备份：Cloudflare Workers KV
- 部署：GitHub Pages, Cloudflare Pages
- 服务工作线程 (Service Workers) 实现离线功能
- 推送通知：Web Push API

## 近期修复和增强 / Recent Fixes and Enhancements

### 1. 服务工作线程 (Service Worker) 修复

- 修复了 404 错误问题
- 优化了缓存策略，分离核心资源和可选资源
- 增强了错误处理和恢复机制
- 改进了缓存版本管理
- 调整了离线页面逻辑，加强了用户体验

### 2. Firebase/Cloudflare 集成优化

- 添加 Cloudflare Workers 配置到 index.html
- 实现数据的双重存储，增强数据安全性
- 添加自动数据同步和恢复机制
- 优化连接检测和错误处理
- 增加本地数据缓存，支持离线数据查看

### 3. Google Maps 标记问题修复

- 替换已弃用的 AdvancedMarkerElement 为传统标记
- 优化标记创建逻辑，减少错误发生率
- 增加地图初始化的错误处理
- 改进标记点击与交互体验

### 4. 数据加载与保存优化

- 为 loadReportsFromFirebase 函数增加重试和超时机制
- 添加本地数据缓存以支持离线模式
- 优化 saveReportToFirebase 函数，增加错误处理和数据恢复
- 实现离线报告创建和自动同步
- 添加用户友好的通知和加载状态指示

### 5. 用户体验增强

- 改进离线模式页面，提供更多实用信息和操作
- 增强数据加载反馈，添加加载状态指示
- 优化错误通知和用户提示
- 改进多语言支持，确保全局一致性

## 部署 / Deployment

应用程序主要通过以下两种方式部署：

1. **GitHub Pages**: 主要部署方式，提供静态内容托管
   - 访问地址：https://yourusername.github.io/ptvalert-pwa/

2. **Cloudflare Pages**: 提供函数计算和数据备份
   - 访问地址：https://ptvalert.pages.dev/

## 配置 / Configuration

### Firebase 配置

应用使用 Firebase 进行认证和数据存储。在 `index.html` 中配置：

```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    databaseURL: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};
```

### Cloudflare Workers 配置

Cloudflare 作为备份存储和函数计算平台：

```javascript
const cloudflareConfig = {
    apiUrl: 'https://ptvalert.pages.dev',
    dataEndpoint: '/api/reports',
    syncEndpoint: '/api/sync-from-firebase',
    notificationEndpoint: '/api/send-notification'
};
```

## 日志和调试 / Logging and Debugging

应用内置多种调试工具：

1. **控制台诊断命令**: 在浏览器控制台执行 `showPtvAlertDiagnostics()` 显示详细信息
2. **Service Worker 日志**: 在控制台的 "Application" > "Service Workers" 查看
3. **网络请求监控**: 在开发者工具的 "Network" 选项卡监控请求和响应

## 离线支持 / Offline Support

应用使用 Service Worker 实现离线功能：

1. **资源缓存**: 缓存核心静态资源，支持离线访问
2. **报告缓存**: 将数据存储在 localStorage，支持离线查看
3. **创建草稿**: 离线时可创建报告草稿，网络恢复后自动上传
4. **状态同步**: 监测网络状态，自动在线/离线切换

## 未来增强计划 / Future Enhancements

1. **自定义标记图标**: 允许用户选择和上传自定义标记图标
2. **数据分析与统计**: 添加报告趋势和热点区域分析
3. **用户评分与信誉系统**: 实现报告可信度评估
4. **增强离线地图**: 支持完整地图区域的离线下载
5. **改进推送通知**: 基于位置和用户兴趣的个性化通知

## 贡献 / Contributing

欢迎贡献代码、报告问题或提供改进建议。请先创建 issue 讨论您的想法或发现的问题。

Contributions are welcome! Please create an issue first to discuss your ideas or problems you've found.

## 许可证 / License

本项目采用 MIT 许可证 - 详情参见 LICENSE 文件

This project is licensed under the MIT License - see the LICENSE file for details 