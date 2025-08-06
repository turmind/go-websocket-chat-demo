# 技术栈和构建系统

## 技术栈

### 后端技术
- **语言**: Go 1.12+
- **Web 框架**: 标准库 `net/http`
- **WebSocket**: Gorilla WebSocket
- **数据库**: Redis (用于消息发布/订阅)
- **日志**: Logrus 结构化日志
- **错误处理**: pkg/errors 包装错误

### 核心依赖库
```go
github.com/gorilla/websocket v1.4.0    // WebSocket 支持
github.com/gomodule/redigo v2.0.0      // Redis 客户端
github.com/heroku/x v0.0.1             // Heroku 工具包
github.com/sirupsen/logrus v1.4.2      // 结构化日志
github.com/pkg/errors v0.8.1           // 错误处理
```

### 部署和容器化
- **容器**: Docker 多阶段构建
- **编排**: Docker Compose
- **云平台**: Heroku 优化

## 构建和开发命令

### 本地开发
```bash
# 启动 Redis 和应用
docker-compose up

# 仅构建应用
go build -o go-websocket-chat-demo .

# 运行应用 (需要 Redis)
./go-websocket-chat-demo
```

### 环境变量
```bash
PORT=8080                           # 服务端口 (默认 8080)
REDIS_URL=redis://localhost:6379    # Redis 连接地址
```

### Docker 构建
```bash
# 构建镜像
docker build -t websocket-chat .

# 运行容器
docker run -p 8080:8080 -e REDIS_URL=redis://redis:6379 websocket-chat
```

### 测试和调试
- 应用启动后访问 `http://localhost:8080` 查看聊天界面
- WebSocket 端点: `ws://localhost:8080/ws`
- 静态文件服务: `./public` 目录

## 构建配置

### Go Modules
- 使用 `go.mod` 管理依赖
- 支持 vendor 模式构建
- CGO_ENABLED=0 用于静态链接

### Docker 配置
- 多阶段构建优化镜像大小
- 基于 Heroku 运行时镜像
- 支持云原生部署