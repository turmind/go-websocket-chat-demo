# 部署指南

本文档详细说明了如何在不同环境中部署现代化 Go WebSocket 聊天应用。

## 📋 部署前准备

### 系统要求

- **Go**: 1.12 或更高版本
- **Redis**: 6.0 或更高版本
- **Docker**: 20.10 或更高版本（可选）
- **Node.js**: 14+ （仅用于开发工具，可选）

### 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `PORT` | `8080` | 应用监听端口 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接地址 |
| `GO_ENV` | `production` | 运行环境 |

## 🐳 Docker 部署（推荐）

### 使用 Docker Compose（最简单）

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd go-websocket-chat-demo
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **查看状态**
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```

4. **访问应用**
   打开浏览器访问 `http://localhost:8080`

5. **停止服务**
   ```bash
   docker-compose down
   ```

### 手动 Docker 部署

1. **构建镜像**
   ```bash
   docker build -t websocket-chat:latest .
   ```

2. **启动 Redis**
   ```bash
   docker run -d --name redis \
     -p 6379:6379 \
     redis:7-alpine redis-server --appendonly yes
   ```

3. **启动应用**
   ```bash
   docker run -d --name websocket-chat \
     -p 8080:8080 \
     -e REDIS_URL=redis://redis:6379 \
     --link redis:redis \
     websocket-chat:latest
   ```

## 🖥️ 本地开发部署

### 方式一：使用 Docker Compose

```bash
# 开发模式启动
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### 方式二：手动启动

1. **启动 Redis**
   ```bash
   # macOS (使用 Homebrew)
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # 或使用 Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **构建并运行应用**
   ```bash
   # 安装依赖
   go mod download
   
   # 构建应用
   go build -o go-websocket-chat-demo .
   
   # 运行应用
   ./go-websocket-chat-demo
   ```

3. **开发模式运行**
   ```bash
   # 使用 air 进行热重载（需要先安装 air）
   go install github.com/cosmtrek/air@latest
   air
   ```

## ☁️ 云平台部署

### Heroku 部署

1. **安装 Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # 其他平台请访问 https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **登录并创建应用**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **添加 Redis 插件**
   ```bash
   heroku addons:create heroku-redis:hobby-dev
   ```

4. **配置环境变量**
   ```bash
   heroku config:set GO_ENV=production
   ```

5. **部署应用**
   ```bash
   git push heroku main
   ```

6. **打开应用**
   ```bash
   heroku open
   ```

### AWS ECS 部署

1. **创建 ECR 仓库**
   ```bash
   aws ecr create-repository --repository-name websocket-chat
   ```

2. **构建并推送镜像**
   ```bash
   # 获取登录令牌
   aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-west-2.amazonaws.com
   
   # 构建镜像
   docker build -t websocket-chat .
   
   # 标记镜像
   docker tag websocket-chat:latest <account-id>.dkr.ecr.us-west-2.amazonaws.com/websocket-chat:latest
   
   # 推送镜像
   docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/websocket-chat:latest
   ```

3. **创建 ECS 任务定义和服务**
   ```json
   {
     "family": "websocket-chat",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "websocket-chat",
         "image": "<account-id>.dkr.ecr.us-west-2.amazonaws.com/websocket-chat:latest",
         "portMappings": [
           {
             "containerPort": 8080,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "PORT",
             "value": "8080"
           },
           {
             "name": "REDIS_URL",
             "value": "redis://your-redis-endpoint:6379"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/websocket-chat",
             "awslogs-region": "us-west-2",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

### Google Cloud Run 部署

1. **构建并推送到 Container Registry**
   ```bash
   # 配置 Docker 认证
   gcloud auth configure-docker
   
   # 构建镜像
   docker build -t gcr.io/your-project-id/websocket-chat .
   
   # 推送镜像
   docker push gcr.io/your-project-id/websocket-chat
   ```

2. **部署到 Cloud Run**
   ```bash
   gcloud run deploy websocket-chat \
     --image gcr.io/your-project-id/websocket-chat \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars REDIS_URL=redis://your-redis-instance:6379
   ```

## 🔧 生产环境优化

### 性能优化

1. **启用 Gzip 压缩**
   ```go
   // 在 main.go 中添加
   func gzipHandler(h http.Handler) http.Handler {
       return gziphandler.GzipHandler(h)
   }
   
   http.Handle("/", gzipHandler(http.FileServer(http.Dir("./public/"))))
   ```

2. **设置适当的缓存头**
   ```go
   func setCacheHeaders(h http.Handler) http.Handler {
       return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           if strings.HasSuffix(r.URL.Path, ".css") || strings.HasSuffix(r.URL.Path, ".js") {
               w.Header().Set("Cache-Control", "public, max-age=31536000")
           }
           h.ServeHTTP(w, r)
       })
   }
   ```

3. **Redis 连接池优化**
   ```go
   pool := &redis.Pool{
       MaxIdle:     10,
       MaxActive:   100,
       IdleTimeout: 240 * time.Second,
       Dial: func() (redis.Conn, error) {
           return redis.Dial("tcp", redisURL)
       },
   }
   ```

### 安全配置

1. **HTTPS 配置**
   ```bash
   # 使用 Let's Encrypt 证书
   certbot --nginx -d your-domain.com
   ```

2. **安全头设置**
   ```go
   func securityHeaders(h http.Handler) http.Handler {
       return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
           w.Header().Set("X-Content-Type-Options", "nosniff")
           w.Header().Set("X-Frame-Options", "DENY")
           w.Header().Set("X-XSS-Protection", "1; mode=block")
           w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
           h.ServeHTTP(w, r)
       })
   }
   ```

3. **速率限制**
   ```go
   // 使用 golang.org/x/time/rate 包
   limiter := rate.NewLimiter(rate.Every(time.Second), 10)
   ```

### 监控和日志

1. **结构化日志**
   ```go
   import "github.com/sirupsen/logrus"
   
   logrus.SetFormatter(&logrus.JSONFormatter{})
   logrus.SetLevel(logrus.InfoLevel)
   ```

2. **健康检查端点**
   ```go
   http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
       w.WriteHeader(http.StatusOK)
       w.Write([]byte("OK"))
   })
   ```

3. **Prometheus 指标**
   ```go
   import "github.com/prometheus/client_golang/prometheus/promhttp"
   
   http.Handle("/metrics", promhttp.Handler())
   ```

## 🔍 故障排除

### 常见问题

1. **Redis 连接失败**
   ```bash
   # 检查 Redis 是否运行
   redis-cli ping
   
   # 检查网络连接
   telnet redis-host 6379
   ```

2. **WebSocket 连接问题**
   ```bash
   # 检查防火墙设置
   sudo ufw status
   
   # 检查代理配置
   curl -I http://localhost:8080
   ```

3. **内存使用过高**
   ```bash
   # 监控内存使用
   docker stats
   
   # 检查 Go 内存分析
   go tool pprof http://localhost:8080/debug/pprof/heap
   ```

### 日志分析

1. **应用日志**
   ```bash
   # Docker 日志
   docker-compose logs -f app
   
   # 系统日志
   journalctl -u websocket-chat -f
   ```

2. **Redis 日志**
   ```bash
   # Redis 日志
   docker-compose logs -f redis
   
   # Redis 慢查询
   redis-cli slowlog get 10
   ```

## 📊 性能监控

### 监控指标

- **连接数**: 当前 WebSocket 连接数
- **消息吞吐量**: 每秒处理的消息数
- **响应时间**: 平均响应时间
- **错误率**: 错误请求比例
- **内存使用**: 应用内存占用
- **Redis 性能**: Redis 操作延迟

### 监控工具

1. **Prometheus + Grafana**
2. **New Relic**
3. **DataDog**
4. **AWS CloudWatch**
5. **Google Cloud Monitoring**

## 🔄 持续集成/持续部署

### GitHub Actions 示例

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-go@v2
      with:
        go-version: 1.19
    - run: go test ./...

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "your-app-name"
        heroku_email: "your-email@example.com"
```

## 📞 支持

如果在部署过程中遇到问题，请：

1. 查看 [故障排除](#-故障排除) 部分
2. 检查 [GitHub Issues](../../issues)
3. 创建新的 Issue 并提供详细信息：
   - 部署环境
   - 错误日志
   - 配置信息
   - 重现步骤

---

**祝您部署顺利！** 🚀