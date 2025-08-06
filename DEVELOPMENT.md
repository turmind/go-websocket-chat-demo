# 开发指南

本文档为开发者提供了参与现代化 Go WebSocket 聊天应用开发的详细指南。

## 🏗️ 项目架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端架构                                │
├─────────────────────────────────────────────────────────────┤
│  Application Manager (应用管理器)                            │
│  ├── Chat State (聊天状态)                                   │
│  ├── Avatar Generator (头像生成器)                           │
│  ├── Connection Status Manager (连接状态管理)                │
│  ├── UI Interaction Manager (UI交互管理)                     │
│  ├── WebSocket Manager (WebSocket管理)                       │
│  ├── Performance Optimizer (性能优化器)                      │
│  └── Component Communication (组件通信)                      │
├─────────────────────────────────────────────────────────────┤
│                      后端架构                                │
├─────────────────────────────────────────────────────────────┤
│  main.go (应用入口)                                          │
│  ├── WebSocket Handler (WebSocket处理)                       │
│  ├── Redis Publisher/Subscriber (Redis发布/订阅)             │
│  ├── Message Broadcasting (消息广播)                         │
│  └── Connection Management (连接管理)                        │
└─────────────────────────────────────────────────────────────┘
```

### 文件结构

```
.
├── main.go                     # Go 应用入口
├── chat.go                     # WebSocket 聊天逻辑
├── redis.go                    # Redis 发布/订阅
├── go.mod                      # Go 模块依赖
├── go.sum                      # 依赖校验和
├── Dockerfile                  # Docker 构建文件
├── docker-compose.yml          # Docker Compose 配置
├── README.md                   # 项目说明
├── DEVELOPMENT.md              # 开发指南
├── DEPLOYMENT.md               # 部署指南
└── public/                     # 前端资源
    ├── index.html              # 主页面
    ├── test-runner.html        # 测试运行器
    ├── css/
    │   ├── application.css     # 基础样式
    │   └── modern-chat.css     # 现代化聊天样式
    └── js/
        ├── jquery-2.0.3.min.js
        ├── reconnecting-websocket.min.js
        ├── application.js      # 主应用逻辑
        ├── performance-optimizer.js  # 性能优化
        ├── integration-test.js # 集成测试
        ├── e2e-test.js        # 端到端测试
        ├── test-framework.js  # 测试框架
        ├── test-validation.js # 测试验证
        └── tests/             # 单元测试
            ├── user-model.test.js
            ├── message-model.test.js
            ├── chat-state.test.js
            ├── avatar-generator.test.js
            ├── websocket-integration.test.js
            └── responsive-layout.test.js
```

## 🛠️ 开发环境设置

### 前置要求

- **Go**: 1.12+ (推荐 1.19+)
- **Redis**: 6.0+
- **Git**: 最新版本
- **Docker**: 20.10+ (可选)
- **Node.js**: 14+ (仅用于开发工具)

### 快速开始

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd go-websocket-chat-demo
   ```

2. **安装依赖**
   ```bash
   go mod download
   ```

3. **启动开发环境**
   ```bash
   # 方式一：使用 Docker Compose
   docker-compose up -d
   
   # 方式二：手动启动
   redis-server &
   go run *.go
   ```

4. **访问应用**
   - 主应用: http://localhost:8080
   - 测试运行器: http://localhost:8080/test-runner.html

### 开发工具推荐

#### Go 开发

- **IDE**: VS Code + Go 扩展, GoLand, Vim + vim-go
- **代码格式化**: `gofmt`, `goimports`
- **代码检查**: `golint`, `go vet`, `golangci-lint`
- **热重载**: `air` 或 `fresh`

```bash
# 安装开发工具
go install golang.org/x/tools/cmd/goimports@latest
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
go install github.com/cosmtrek/air@latest
```

#### 前端开发

- **浏览器**: Chrome DevTools, Firefox Developer Tools
- **代码编辑器**: VS Code, Sublime Text, Atom
- **调试工具**: 浏览器开发者工具
- **性能分析**: Chrome Performance Tab, Lighthouse

## 📝 编码规范

### Go 代码规范

1. **命名约定**
   ```go
   // 包名：小写，简短，有意义
   package main
   
   // 常量：大写字母和下划线
   const MAX_CONNECTIONS = 1000
   
   // 变量和函数：驼峰命名
   var userCount int
   func getUserCount() int { ... }
   
   // 结构体：首字母大写（公开）或小写（私有）
   type User struct {
       ID   string `json:"id"`
       Name string `json:"name"`
   }
   ```

2. **错误处理**
   ```go
   // 总是检查错误
   if err != nil {
       log.Printf("Error: %v", err)
       return err
   }
   
   // 使用 pkg/errors 包装错误
   return errors.Wrap(err, "failed to connect to Redis")
   ```

3. **注释规范**
   ```go
   // Package main implements a WebSocket chat server.
   package main
   
   // User represents a chat user.
   type User struct {
       // ID is the unique identifier for the user.
       ID string `json:"id"`
   }
   
   // NewUser creates a new user with the given name.
   func NewUser(name string) *User {
       return &User{
           ID: generateID(),
       }
   }
   ```

### JavaScript 代码规范

1. **ES6+ 语法**
   ```javascript
   // 使用 const/let 而不是 var
   const users = new Map();
   let currentUser = null;
   
   // 使用箭头函数
   const handleMessage = (message) => {
       console.log('Received:', message);
   };
   
   // 使用模板字符串
   const greeting = `Hello, ${user.name}!`;
   
   // 使用解构赋值
   const { id, name, avatar } = user;
   ```

2. **类和模块**
   ```javascript
   // 使用 ES6 类
   class ChatState {
       constructor() {
           this.users = new Map();
           this.messages = [];
       }
       
       addUser(user) {
           this.users.set(user.id, user);
           this.emit('userAdded', user);
       }
   }
   
   // 使用模块模式
   const ChatModule = (() => {
       const privateVar = 'private';
       
       return {
           publicMethod() {
               return privateVar;
           }
       };
   })();
   ```

3. **异步编程**
   ```javascript
   // 使用 async/await
   async function loadUserData(userId) {
       try {
           const response = await fetch(`/api/users/${userId}`);
           const user = await response.json();
           return user;
       } catch (error) {
           console.error('Failed to load user:', error);
           throw error;
       }
   }
   
   // 使用 Promise
   function connectWebSocket() {
       return new Promise((resolve, reject) => {
           const ws = new WebSocket(wsUrl);
           ws.onopen = () => resolve(ws);
           ws.onerror = (error) => reject(error);
       });
   }
   ```

### CSS 代码规范

1. **BEM 命名方法**
   ```css
   /* Block */
   .chat-container { }
   
   /* Element */
   .chat-container__header { }
   .chat-container__body { }
   
   /* Modifier */
   .chat-container--mobile { }
   .chat-container__header--collapsed { }
   ```

2. **CSS 自定义属性**
   ```css
   :root {
       --primary-color: #007bff;
       --secondary-color: #6c757d;
       --font-size-base: 14px;
       --spacing-sm: 8px;
       --spacing-md: 16px;
       --spacing-lg: 24px;
   }
   
   .button {
       background-color: var(--primary-color);
       font-size: var(--font-size-base);
       padding: var(--spacing-sm) var(--spacing-md);
   }
   ```

3. **响应式设计**
   ```css
   /* Mobile First */
   .sidebar {
       width: 100%;
   }
   
   /* Tablet */
   @media (min-width: 768px) {
       .sidebar {
           width: 300px;
       }
   }
   
   /* Desktop */
   @media (min-width: 1024px) {
       .sidebar {
           width: 350px;
       }
   }
   ```

## 🧪 测试指南

### 测试类型

1. **单元测试**: 测试单个函数或组件
2. **集成测试**: 测试组件间的交互
3. **端到端测试**: 测试完整的用户流程

### Go 测试

```go
// user_test.go
package main

import (
    "testing"
)

func TestNewUser(t *testing.T) {
    user := NewUser("testuser")
    
    if user.Name != "testuser" {
        t.Errorf("Expected name 'testuser', got '%s'", user.Name)
    }
    
    if user.ID == "" {
        t.Error("Expected non-empty ID")
    }
}

func TestUserValidation(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected bool
    }{
        {"valid name", "john", true},
        {"empty name", "", false},
        {"too long", strings.Repeat("a", 101), false},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := validateUserName(tt.input)
            if result != tt.expected {
                t.Errorf("Expected %v, got %v", tt.expected, result)
            }
        })
    }
}
```

### JavaScript 测试

```javascript
// 使用内置测试框架
testFramework.describe('User Model', () => {
    testFramework.it('should create user with valid data', () => {
        const user = new User('testuser', '😀', 'custom');
        
        testFramework.expect(user.handle).toBe('testuser');
        testFramework.expect(user.avatar).toBe('😀');
        testFramework.expect(user.avatarType).toBe('custom');
        testFramework.expect(user.id).toBeTruthy();
    });
    
    testFramework.it('should generate unique IDs', () => {
        const user1 = new User('user1');
        const user2 = new User('user2');
        
        testFramework.expect(user1.id).not.toBe(user2.id);
    });
});
```

### 运行测试

```bash
# Go 测试
go test ./...                    # 运行所有测试
go test -v ./...                 # 详细输出
go test -cover ./...             # 测试覆盖率
go test -race ./...              # 竞态检测

# JavaScript 测试
# 访问 http://localhost:8080/test-runner.html
# 或在浏览器控制台运行
testFramework.runTests()
```

## 🔧 调试指南

### Go 调试

1. **使用 Delve 调试器**
   ```bash
   # 安装 Delve
   go install github.com/go-delve/delve/cmd/dlv@latest
   
   # 调试应用
   dlv debug
   
   # 设置断点
   (dlv) break main.main
   (dlv) continue
   ```

2. **日志调试**
   ```go
   import "github.com/sirupsen/logrus"
   
   logrus.SetLevel(logrus.DebugLevel)
   logrus.Debug("Debug message")
   logrus.Info("Info message")
   logrus.Error("Error message")
   ```

3. **性能分析**
   ```go
   import _ "net/http/pprof"
   
   go func() {
       log.Println(http.ListenAndServe("localhost:6060", nil))
   }()
   
   // 访问 http://localhost:6060/debug/pprof/
   ```

### JavaScript 调试

1. **浏览器开发者工具**
   ```javascript
   // 设置断点
   debugger;
   
   // 控制台输出
   console.log('Debug info:', data);
   console.error('Error:', error);
   console.table(users);
   
   // 性能监控
   console.time('operation');
   // ... 代码 ...
   console.timeEnd('operation');
   ```

2. **WebSocket 调试**
   ```javascript
   // 监听 WebSocket 事件
   websocket.addEventListener('message', (event) => {
       console.log('WebSocket message:', event.data);
   });
   
   websocket.addEventListener('error', (error) => {
       console.error('WebSocket error:', error);
   });
   ```

## 🚀 性能优化

### 后端优化

1. **连接池优化**
   ```go
   pool := &redis.Pool{
       MaxIdle:     10,
       MaxActive:   100,
       IdleTimeout: 240 * time.Second,
       Wait:        true,
   }
   ```

2. **内存优化**
   ```go
   // 使用对象池
   var messagePool = sync.Pool{
       New: func() interface{} {
           return &Message{}
       },
   }
   
   func getMessage() *Message {
       return messagePool.Get().(*Message)
   }
   
   func putMessage(msg *Message) {
       msg.Reset()
       messagePool.Put(msg)
   }
   ```

3. **并发优化**
   ```go
   // 使用 worker pool
   type WorkerPool struct {
       workers chan chan Job
       jobQueue chan Job
   }
   
   func (wp *WorkerPool) Start() {
       for i := 0; i < wp.maxWorkers; i++ {
           worker := NewWorker(wp.workers)
           worker.Start()
       }
   }
   ```

### 前端优化

1. **虚拟滚动**
   ```javascript
   class VirtualScroller {
       constructor(container, itemHeight) {
           this.container = container;
           this.itemHeight = itemHeight;
           this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 5;
       }
       
       render(items, startIndex) {
           const endIndex = Math.min(startIndex + this.visibleItems, items.length);
           const visibleItems = items.slice(startIndex, endIndex);
           
           this.container.innerHTML = '';
           visibleItems.forEach((item, index) => {
               const element = this.createItemElement(item, startIndex + index);
               this.container.appendChild(element);
           });
       }
   }
   ```

2. **防抖和节流**
   ```javascript
   // 防抖
   function debounce(func, wait) {
       let timeout;
       return function executedFunction(...args) {
           const later = () => {
               clearTimeout(timeout);
               func(...args);
           };
           clearTimeout(timeout);
           timeout = setTimeout(later, wait);
       };
   }
   
   // 节流
   function throttle(func, limit) {
       let inThrottle;
       return function() {
           const args = arguments;
           const context = this;
           if (!inThrottle) {
               func.apply(context, args);
               inThrottle = true;
               setTimeout(() => inThrottle = false, limit);
           }
       };
   }
   ```

3. **内存管理**
   ```javascript
   class MemoryManager {
       constructor() {
           this.cache = new Map();
           this.maxSize = 1000;
       }
       
       set(key, value) {
           if (this.cache.size >= this.maxSize) {
               const firstKey = this.cache.keys().next().value;
               this.cache.delete(firstKey);
           }
           this.cache.set(key, value);
       }
       
       cleanup() {
           this.cache.clear();
       }
   }
   ```

## 🔄 Git 工作流

### 分支策略

```
main (生产分支)
├── develop (开发分支)
│   ├── feature/user-management (功能分支)
│   ├── feature/message-optimization (功能分支)
│   └── bugfix/websocket-reconnect (修复分支)
└── hotfix/security-patch (热修复分支)
```

### 提交规范

```bash
# 提交格式
<type>(<scope>): <subject>

<body>

<footer>

# 示例
feat(chat): add user avatar support

- Add avatar generation system
- Support emoji and initial avatars
- Update UI to display avatars

Closes #123
```

### 提交类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

## 📚 学习资源

### Go 相关

- [Go 官方文档](https://golang.org/doc/)
- [Effective Go](https://golang.org/doc/effective_go.html)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- [Gorilla WebSocket 文档](https://pkg.go.dev/github.com/gorilla/websocket)

### JavaScript 相关

- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)

### Redis 相关

- [Redis 官方文档](https://redis.io/documentation)
- [Redis Pub/Sub](https://redis.io/topics/pubsub)
- [Redis 最佳实践](https://redis.io/topics/memory-optimization)

## 🤝 贡献流程

1. **Fork 项目**
2. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **编写代码和测试**
4. **提交更改**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
5. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **创建 Pull Request**

### Pull Request 检查清单

- [ ] 代码遵循项目规范
- [ ] 添加了适当的测试
- [ ] 测试全部通过
- [ ] 更新了相关文档
- [ ] 提交信息清晰明确
- [ ] 没有合并冲突

## 📞 获取帮助

- **GitHub Issues**: 报告 bug 或请求功能
- **GitHub Discussions**: 技术讨论和问答
- **代码审查**: 通过 Pull Request 获取反馈
- **文档**: 查看项目文档和注释

---

**感谢您的贡献！** 🎉