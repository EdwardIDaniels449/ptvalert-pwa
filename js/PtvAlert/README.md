# PtvAlert - 墨尔本公共场所事件报告应用

[English Version](#english-version)

## 项目概述

PtvAlert是一个基于网页的应用程序，允许用户在墨尔本地图上报告和查看各种事件。该应用程序使用Google Maps API显示地图，Firebase进行用户认证和数据存储，旨在帮助墨尔本居民和游客了解城市中正在发生的事件。

## 主要功能

### 基础功能
- 用户认证系统（登录/注册）
- 在地图上选择位置并发布报告
- 查看其他用户发布的报告
- 为报告添加照片和评论
- 国际化支持（中文/英文）
- 响应式设计，适配各种设备

### 新增功能
1. **位置自动定位**
   - 根据描述文本自动查找地理位置
   - 支持中英文地点描述
   - 墨尔本主要区域的优先匹配

2. **直接添加描述功能**
   - 绿色"直接添加描述"按钮，无需先选位置
   - 自动地理编码将描述转化为地图位置
   - 一步生成标记，无需填写额外信息
   - 使用狗emoji作为标记图标

3. **标记信息增强**
   - 鼠标悬停显示报告简要信息
   - 点击标记查看完整报告详情
   - 支持显示原始描述文本

4. **智能emoji选择**
   - 根据描述内容自动选择合适的emoji图标
   - 默认使用狗emoji标记

5. **键盘快捷键支持**
   - 使用Ctrl+Enter/Command+Enter快速提交描述

## 使用方法

### 直接添加描述功能
1. 点击地图右上角的绿色"直接添加描述"按钮
2. 在弹出窗口中输入事件描述
3. 点击"添加到地图"或按Ctrl+Enter/Command+Enter
4. 系统会自动根据描述寻找位置并添加标记
5. 标记会显示为狗的emoji图标

### 根据描述定位功能
1. 点击"添加报告"按钮并在地图上选择一个大致位置
2. a) 在描述框中输入内容，然后点击"根据描述定位"按钮
   b) 或直接使用"使用当前位置"按钮获取您的位置
3. 系统会根据您的描述调整位置并添加标记

## 预设位置
系统内置了墨尔本主要区域的地点数据库，包括：
- 中央商务区 (CBD)
- 南岸 (Southbank)
- 圣基尔达 (St Kilda)
- 卡尔顿 (Carlton)
- 菲茨罗伊 (Fitzroy)
- 多克兰兹 (Docklands)
- 墨尔本大学 (Melbourne University)
- 佛林德斯街车站 (Flinders Street Station)
- 南十字星车站 (Southern Cross Station)

---

<a name="english-version"></a>
# PtvAlert - Melbourne Public Event Reporting Application

## Project Overview

PtvAlert is a web-based application that allows users to report and view various events on a map of Melbourne. The application uses Google Maps API to display the map, Firebase for user authentication and data storage, and aims to help Melbourne residents and visitors stay informed about events happening in the city.

## Key Features

### Basic Features
- User authentication system (login/register)
- Select locations on the map and publish reports
- View reports published by other users
- Add photos and comments to reports
- Internationalization support (Chinese/English)
- Responsive design for various devices

### New Features
1. **Automatic Location Finding**
   - Automatically find geographic locations based on text descriptions
   - Support for location descriptions in both Chinese and English
   - Priority matching for major Melbourne areas

2. **Direct Description Addition**
   - Green "Direct Description" button, no need to select a location first
   - Automatic geocoding converts descriptions to map locations
   - One-step marker generation without filling in additional information
   - Dog emoji as marker icon

3. **Enhanced Marker Information**
   - Hover to see brief report information
   - Click markers to view full report details
   - Support for displaying original description text

4. **Smart Emoji Selection**
   - Automatically select appropriate emoji icons based on description content
   - Default to dog emoji for markers

5. **Keyboard Shortcut Support**
   - Use Ctrl+Enter/Command+Enter to quickly submit descriptions

## How to Use

### Direct Description Addition Feature
1. Click the green "Direct Description" button in the top right of the map
2. Enter an event description in the popup window
3. Click "Add to Map" or press Ctrl+Enter/Command+Enter
4. The system will automatically find the location based on the description and add a marker
5. The marker will be displayed as a dog emoji icon

### Finding Location from Description
1. Click the "Add Report" button and select an approximate location on the map
2. a) Enter content in the description box, then click the "Find Location from Description" button
   b) Or directly use the "Use Current Location" button to get your position
3. The system will adjust the position based on your description and add a marker

## Preset Locations
The system has a built-in database of major Melbourne areas, including:
- Central Business District (CBD)
- Southbank
- St Kilda
- Carlton
- Fitzroy
- Docklands
- Melbourne University
- Flinders Street Station
- Southern Cross Station

## 项目简介

PtvAlert网页版是一个基于Google Maps和Firebase的实时交通/事件上报与可视化平台。用户可以在地图上添加带有图片和描述的报告，所有用户都能实时看到这些报告。每个报告会以emoji标记显示在地图上，点击可查看详情、评论、编辑或删除。报告会在创建3小时后自动从地图和数据库消失。

## 最新更新
- **高级语言设置功能**:
  - 登录页与主页之间的语言偏好同步功能，保持一致的用户体验
  - 用户选择的语言设置会自动保存并在整个应用中保持一致
  - 添加了更多界面元素的多语言支持，包括弹幕和电车信息
  - 登录页面添加了快速访问二维码，方便移动端用户直接扫码访问
  - 优化了语言切换的响应速度和稳定性
- **登录界面动画增强**:
  - 添加了有趣的背景动画效果，包括交通相关emoji图标落下动画
  - 实现了生动的追逐动画，增强视觉趣味性
  - 优化了动画性能，确保在移动设备上流畅运行
- **弹幕系统智能翻译**:
  - 弹幕内容现在会根据用户选择的界面语言自动翻译
  - 支持中英文电车线路通知的智能识别和格式转换
  - 添加了交通术语专业词典，提供准确的双向翻译
  - 实时翻译用户评论和报告内容，确保语言一致性
  - 特殊格式内容（如"X号线"与"Route X"）的智能转换
- **登录流程优化**：
  - 改进了用户登录流程，确保用户必须先登录后才能访问地图界面
  - 完善了游客模式标签的多语言支持，确保随语言切换自动更新
  - 增强了登出功能，确保完全清除所有登录状态
  - 优化了用户菜单的显示和交互体验
- **弹幕系统增强**：
  - 降低了弹幕移动速度，使其更易阅读（10-15秒完成一次移动）
  - 降低了弹幕显示的频率，减少了信息过载（2.5秒间隔）
  - 优化了弹幕的视觉样式：更大的字体、更明显的背景、更清晰的文字阴影
  - 增加了弹幕之间的间距，减少重叠，提高可读性
  - 添加了边框和阴影效果，使弹幕在各种背景下都清晰可见
- **Firebase认证系统优化**：
  - 修复了Firebase认证配置问题
  - 移除了自动强制跳转至游客模式的行为
  - 恢复了正常的邮箱/密码注册和登录功能
  - 保留游客模式作为快速访问选项
  - 增强了登录状态验证逻辑，支持多种登录方式共存
  - 优化了错误处理，显示更友好的错误提示信息
  - 如果Firebase不可用时，系统会自动提供游客模式作为备选方案
  - 支持在普通登录和游客模式之间自由切换

## 主要功能
- **用户账户系统**
  - 支持邮箱注册和登录
  - 提供游客模式无需注册即可访问
  - 个人资料管理和密码重置
  - 登录状态持久化
  - 简单直观的登录/登出流程
  - **语言偏好记忆功能**：应用会记住并恢复用户的语言偏好设置
- 地图实时显示所有用户上报的事件（带emoji标记）
- 支持图片上传、文字描述
- 支持评论、编辑、删除自己的报告
- 报告3小时后自动过期消失
- **智能弹幕系统**：
  - 多语言支持：弹幕内容会根据用户界面语言自动切换中英文
  - 智能翻译：自动识别并翻译电车线路通知和用户报告
  - 专业词典：包含交通领域专业术语的中英文映射
  - 格式转换：识别并转换"X号线"和"Route X"等特殊格式
  - 多轨道弹幕设计，保证消息清晰可见
  - 调整的弹幕速度和显示频率，提升阅读体验
  - 优化的弹幕视觉样式，增强可读性
  - 集成YarraTrams电车服务最新信息，包含发布时间戳
  - 自动将用户报告和评论添加到弹幕流
  - 支持多种样式区分不同类型的消息（服务变更、安全提醒、用户报告等）
  - 每日凌晨自动更新，也可手动刷新获取最新信息
- 支持移动端和PC端自适应
- **支持中英文界面一键切换**：
  - 右上角🌐按钮，所有界面元素均可实时切换中/英文
  - 语言设置会自动保存并同步到登录和主页界面
  - 电车线路通知也会随界面语言自动切换显示格式
  - 登录页提供扫码快速访问功能，方便移动端用户

## 使用方法

1. **克隆或下载本项目代码**
2. **打开 `login.html` 文件**（建议使用本地服务器环境，如VSCode Live Server、http-server等）
3. **登录系统**：
   - 使用邮箱注册新账号
   - 使用已有账号登录
   - 选择"游客访问"无需注册即可使用
   - 或直接扫描登录页面上的二维码在移动设备上快速访问
4. **首次加载会自动初始化Firebase和Google地图**
5. **右上角🌐按钮可随时切换中英文界面**，所有按钮、弹窗、提示和弹幕等会实时切换语言
6. **顶部弹幕区** 展示最新电车服务信息和用户报告，点击右上角"刷新电车信息"按钮获取最新更新
7. **点击"+" 添加报告"按钮**，在地图上点选位置，填写描述、上传图片，点击"确定"提交
8. **地图上会出现emoji标记**，点击标记可查看详情、评论、编辑或删除（仅限本人）
9. **报告3小时后自动消失**
10. **右上角用户菜单**可管理个人资料或退出登录

## 依赖说明
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/overview)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [QRCode.js](https://github.com/davidshimjs/qrcodejs) - 用于生成快速访问二维码
- 无需后端服务器，所有数据实时同步到Firebase

## 本地开发与部署

1. **获取Google Maps API Key**
   - 申请并替换 `index.html` 中 `<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY...` 的 `YOUR_API_KEY`
2. **配置Firebase**
   - 使用你自己的Firebase项目，替换 `index.html` 和 `login.html` 里的 `firebaseConfig` 配置
   - 在Firebase控制台中启用邮箱密码和匿名登录方式
   - 具体步骤：
     1. 访问 [Firebase控制台](https://console.firebase.google.com/)
     2. 创建新项目或选择现有项目
     3. 在"构建 > Authentication > Sign-in method"中启用"邮箱/密码"登录方式
     4. 在"设置 > 项目设置 > 您的应用 > SDK设置和配置"获取Firebase配置对象
     5. 将获取的配置复制到`login.html`和`index.html`中的`firebaseConfig`变量
     6. 在"Authentication > Settings > 已获授权的网域"中添加您的域名（本地开发添加localhost）
3. **本地预览**
   - 推荐用VSCode插件"Live Server"或`npx http-server`等工具本地预览
   - 直接用浏览器打开`index.html`部分功能可能受限（如图片上传、定位等）

## 注意事项
- 本项目为前端纯静态实现，所有用户数据公开存储于Firebase
- 请勿上传敏感信息或隐私图片
- 若需正式部署，请自行配置域名、API密钥和Firebase安全规则

## 贡献与反馈
如有建议或Bug反馈，请提交Issue或PR。

---

MIT License 