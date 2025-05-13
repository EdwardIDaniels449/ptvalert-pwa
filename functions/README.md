# Firebase Functions 推送通知服务

这是用于PtvAlert的Firebase Functions推送通知服务，负责在新地图标记添加时向用户发送推送通知。

## 设置步骤

1. **安装Firebase CLI**（如果尚未安装）
   ```bash
   npm install -g firebase-tools
   ```

2. **登录到Firebase**
   ```bash
   firebase login
   ```

3. **切换到正确的Firebase项目**
   ```bash
   firebase use 您的项目ID
   ```

4. **设置VAPID密钥**（重要！）
   ```bash
   firebase functions:config:set vapid.public_key="BFpa0WyDaUOEPw7iKaxLHjf1yReNiMXHdSh4t3PBXq962LCjQmpeFKs63PDhwd_F5kPqi7PsI6KGpIoXsaXMJ70" vapid.private_key="8J0ZKujkR48Rpgu9gIBkym7xsnH9yuZhuhhkw6XZ3fg"
   ```

5. **安装依赖**
   ```bash
   cd functions
   npm install
   ```

6. **测试本地环境**
   ```bash
   firebase emulators:start
   ```

7. **部署到Firebase**
   ```bash
   firebase deploy --only functions
   ```

## 安全注意事项

- **不要**将VAPID私钥提交到版本控制系统
- **仅**通过Firebase Functions配置存储密钥
- 如需更改联系邮箱，请编辑`index.js`文件中的`mailto:`地址 