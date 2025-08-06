[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

# 现代化 Go WebSocket 聊天应用

这是一个基于 Go + Redis 的现代化实时聊天应用，具有美观的用户界面和丰富的功能特性。应用使用 Redis 作为消息中间件，支持水平扩展到多个实例。

## ✨ 新功能特性

### 🎨 现代化用户界面
- **响应式设计**: 完美适配桌面、平板和移动设备
- **现代化布局**: 采用 CSS Grid 和 Flexbox 的双栏布局
- **优雅动画**: 流畅的过渡动画和交互反馈
- **深色/浅色主题**: 支持主题切换（开发中）
- **无障碍支持**: 完整的 ARIA 标签和键盘导航支持

### 👤 用户管理系统
- **个性化头像**: 支持首字母、表情符号和预设头像
- **用户状态管理**: 实时显示在线/离线状态
- **用户设置**: 可自定义用户名和头像
- **联系人列表**: 显示所有在线用户和最后活动时间

### 💬 增强的消息功能
- **消息状态**: 显示发送中、已发送、失败等状态
- **消息时间**: 智能显示相对时间和绝对时间
- **消息分组**: 连续消息自动分组显示
- **系统消息**: 支持系统通知和状态消息
- **消息性能优化**: 大量消息时的虚拟化渲染

### 🔌 WebSocket 集成
- **自动重连**: 网络断开时自动重连
- **连接状态**: 实时显示连接状态和网络质量
- **心跳检测**: 定期检测连接健康状态
- **错误处理**: 优雅的错误处理和用户提示

### 📱 移动端优化
- **触摸友好**: 优化的触摸交互体验
- **移动菜单**: 侧边栏在移动端可折叠
- **性能优化**: 针对移动设备的性能优化
- **离线支持**: 基础的离线功能支持

### 🧪 完整的测试套件
- **单元测试**: 覆盖所有核心组件
- **集成测试**: 测试组件间的协作
- **端到端测试**: 完整的用户流程测试
- **性能测试**: 负载和性能监控

## 🚀 快速开始

### 本地开发

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd go-websocket-chat-demo
   ```

2. **启动 Redis 和应用**
   ```bash
   docker-compose up
   ```

3. **或者手动启动**
   ```bash
   # 启动 Redis
   redis-server
   
   # 构建并运行应用
   go build -o go-websocket-chat-demo .
   ./go-websocket-chat-demo
   ```

4. **访问应用**
   打开浏览器访问 `http://localhost:8080`

### 环境变量

```bash
PORT=8080                           # 服务端口 (默认 8080)
REDIS_URL=redis://localhost:6379    # Redis 连接地址
```

## 🏗️ 技术架构

### 后端技术栈
- **Go 1.12+**: 主要编程语言
- **Gorilla WebSocket**: WebSocket 连接管理
- **Redis**: 消息发布/订阅和状态存储
- **Docker**: 容器化部署
- **Heroku**: 云平台部署

### 前端技术栈
- **原生 JavaScript**: 无框架依赖的现代 JS
- **CSS Grid & Flexbox**: 现代化布局系统
- **CSS 自定义属性**: 主题和样式管理
- **Web APIs**: 使用现代浏览器 API
- **Progressive Enhancement**: 渐进式增强设计

### 核心组件架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Manager                      │
├─────────────────────────────────────────────────────────────┤
│  Chat State  │  Avatar Gen  │  Connection  │  Performance   │
│   Manager    │   erator     │   Manager    │   Optimizer    │
├─────────────────────────────────────────────────────────────┤
│  UI Interaction │  WebSocket  │  User Status │  Component   │
│    Manager      │   Manager   │   Manager    │ Communication│
├─────────────────────────────────────────────────────────────┤
│              Message Performance Manager                    │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 测试

### 运行测试

1. **打开测试运行器**
   访问 `http://localhost:8080/test-runner.html`

2. **运行不同类型的测试**
   - **单元测试**: 测试单个组件功能
   - **集成测试**: 测试组件间协作
   - **端到端测试**: 测试完整用户流程

3. **命令行测试**
   ```bash
   # 运行 Go 后端测试
   go test ./...
   
   # 前端测试通过浏览器运行
   ```

### 测试覆盖范围

- ✅ 用户模型和管理
- ✅ 消息模型和处理
- ✅ 聊天状态管理
- ✅ 头像生成系统
- ✅ WebSocket 集成
- ✅ 响应式布局
- ✅ 性能优化
- ✅ 错误处理
- ✅ 无障碍功能

## 📦 部署

### Docker 部署

```bash
# 构建镜像
docker build -t websocket-chat .

# 运行容器
docker run -p 8080:8080 -e REDIS_URL=redis://redis:6379 websocket-chat
```

### Heroku 部署

```bash
# 创建 Heroku 应用
heroku create your-app-name

# 添加 Redis 插件
heroku addons:create heroku-redis:hobby-dev

# 部署应用
git push heroku main
```

### Docker Compose 部署

```bash
# 启动完整环境
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 🔧 配置选项

### 前端配置

应用支持通过 CSS 自定义属性进行主题配置：

```css
:root {
  --primary-color: #007bff;
  --sidebar-width: 300px;
  --font-size-base: 14px;
  --border-radius: 8px;
  /* 更多配置选项... */
}
```

### 性能配置

```javascript
// 性能优化配置
const performanceConfig = {
  maxMessages: 1000,        // 最大消息数量
  virtualScrollThreshold: 100, // 虚拟滚动阈值
  memoryCleanupInterval: 60000, // 内存清理间隔
  batchRequestDelay: 100    // 请求批处理延迟
};
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循 Go 代码规范
- 使用语义化的 commit 消息
- 添加适当的测试覆盖
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔗 相关链接

- [在线演示](http://go-websocket-chat-demo.herokuapp.com)
- [Heroku 部署文档](https://devcenter.heroku.com/articles/go-websockets)
- [Go WebSocket 文档](https://pkg.go.dev/github.com/gorilla/websocket)
- [Redis 文档](https://redis.io/documentation)

## 📞 支持

如果您遇到问题或有建议，请：

1. 查看 [Issues](../../issues) 页面
2. 创建新的 Issue
3. 参与 [Discussions](../../discussions)

---

**享受现代化的聊天体验！** 🎉
