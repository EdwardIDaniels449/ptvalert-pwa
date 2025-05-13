# PtvAlert

PtvAlert is a Progressive Web App (PWA) for sharing and receiving real-time transit information and alerts in Melbourne. This version uses Cloudflare Workers and KV storage instead of Firebase for backend functionality.

## Features

- **Real-time map markers**: Users can add markers on the map to share information about transit issues or events
- **Push notifications**: Receive instant notifications about new markers in your area
- **Offline support**: The app works even when you're offline using IndexedDB
- **PWA features**: Install to home screen, offline access, and push notifications
- **Multi-language support**: Available in English and Chinese

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Map**: Leaflet.js
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare KV
- **Push Notifications**: Web Push API
- **Offline Storage**: IndexedDB

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- A Cloudflare account with Workers enabled

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/ptvalert.git
   cd ptvalert
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Generate VAPID keys for push notifications:
   ```
   npm run generate-keys
   ```

4. Update the `wrangler.toml` file with your KV namespace IDs and VAPID keys.

5. Deploy the Cloudflare Worker:
   ```
   npm run publish
   ```

6. Update the API_BASE_URL in `js/notification-handler.js` to your Cloudflare Worker URL.

## Directory Structure

```
├── cloudflare-setup-guide.md   # Guide for setting up Cloudflare Workers
├── cloudflare-worker.js        # Main Cloudflare Worker code
├── generate-keys.js            # Script to generate VAPID keys
├── images/                     # App icons and images
├── index.html                  # Main app page
├── js/                         # JavaScript files
│   └── notification-handler.js # Push notification handling
├── login.html                  # User login page
├── manifest.json               # Web app manifest
├── offline.html                # Offline fallback page
├── package.json                # Project dependencies
├── service-worker.js           # Service worker for PWA functionality
└── wrangler.toml               # Cloudflare Workers configuration
```

## Cloudflare KV Namespaces

The app uses the following KV namespaces:

1. **SUBSCRIPTIONS**: Stores push notification subscriptions
2. **MARKERS**: Stores map marker data
3. **ADMIN_USERS**: Stores admin user IDs
4. **BANNED_USERS**: Stores banned user information

## Admin Functions

To set a user as admin:

1. Use the make-admin.html tool
2. Or use the admin panel in the app (if you already have admin access)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# 地图标记推送通知系统

这个项目是一个基于Cloudflare Worker的推送通知系统，用于地图标记的实时更新通知。

## 功能特点

- 完全基于Cloudflare Worker，无需传统服务器
- 使用Web Push API实现浏览器推送通知
- 支持离线功能和后台同步
- 完整的ECE加密实现 (RFC 8291)
- 地图标记的实时更新

## 安装与配置

### 1. Cloudflare Worker 配置

1. 在Cloudflare Worker中部署`cloudflare-worker.js`
2. 设置以下环境变量:
   - `VAPID_PUBLIC_KEY`: Web Push的公钥
   - `VAPID_PRIVATE_KEY`: Web Push的私钥
   - `VAPID_SUBJECT`: 联系邮箱(例如 mailto:your-email@example.com)

3. 绑定以下KV命名空间:
   - `SUBSCRIPTIONS`: 存储推送订阅
   - `MARKERS`: 存储地图标记
   - `ADMIN_USERS`: 存储管理员用户

### 2. 前端配置

1. 复制`config.example.js`为`config.js`
2. 在`config.js`中填入以下信息:
   - `SERVER_URL`: 您的Cloudflare Worker URL
   - `VAPID_PUBLIC_KEY`: 与Worker中相同的VAPID公钥

### 3. 生成VAPID密钥

```bash
# 使用web-push库生成VAPID密钥
npx web-push generate-vapid-keys
```

## 使用方法

1. 确保服务配置正确
2. 打开`push-demo.html`测试推送通知功能
3. 点击"订阅推送通知"按钮授权接收通知
4. 添加或更新地图标记时将自动接收通知

## 文件结构

- `cloudflare-worker.js`: 后端Worker代码
- `push-client.js`: 前端推送客户端API
- `service-worker.js`: 处理推送通知的Service Worker
- `push-demo.html`: 演示页面
- `config.example.js`: 配置文件示例
- `config.js`: 实际配置文件 (需自行创建，**不要提交到GitHub**)

## 同步到GitHub

使用提供的脚本同步代码到GitHub:

```bash
chmod +x sync-to-github.sh
./sync-to-github.sh
```

## 安全注意事项

- 确保`.gitignore`中包含`config.js`以避免泄露VAPID密钥
- VAPID私钥应只存在于Cloudflare环境变量中
- 定期更新VAPID密钥以增强安全性

## 许可证

MIT

## Latest deployment
Latest update: $(date '+%Y-%m-%d %H:%M:%S') 