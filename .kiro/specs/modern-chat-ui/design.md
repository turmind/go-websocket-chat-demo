# 设计文档

## 概述

本设计文档描述了如何将现有的简单聊天界面改造为现代化的即时通讯界面。设计将保持现有的Go WebSocket后端架构不变，主要专注于前端界面的重新设计和用户体验的提升。

## 架构

### 整体架构
- **后端**: 保持现有的Go WebSocket服务器架构
- **前端**: 重新设计HTML/CSS/JavaScript实现现代化界面
- **通信协议**: 继续使用现有的WebSocket消息格式
- **数据存储**: 继续使用Redis进行消息发布/订阅

### 技术栈
- **前端框架**: 原生JavaScript (保持轻量级)
- **CSS框架**: 自定义CSS + CSS Grid/Flexbox布局
- **图标**: 使用CSS图标或SVG图标
- **字体**: 系统字体栈确保跨平台一致性

## 组件和接口

### 1. 主布局组件 (MainLayout)

**职责**: 管理整体页面布局和响应式设计

**结构**:
```html
<div class="chat-container">
  <aside class="sidebar">
    <!-- 左侧联系人列表 -->
  </aside>
  <main class="chat-area">
    <!-- 右侧聊天区域 -->
  </main>
</div>
```

**CSS Grid布局**:
- 桌面端: `grid-template-columns: 300px 1fr`
- 移动端: `grid-template-columns: 1fr` (单栏布局)

### 2. 联系人列表组件 (ContactList)

**职责**: 显示在线用户列表和用户状态管理

**功能**:
- 实时显示在线用户
- 用户头像生成和显示
- 在线状态指示器
- 用户选择和高亮

**数据结构**:
```javascript
const user = {
  id: string,
  name: string,
  avatar: string, // 头像URL或生成的头像
  isOnline: boolean,
  lastSeen: timestamp
}
```

### 3. 聊天区域组件 (ChatArea)

**职责**: 显示聊天消息和处理用户输入

**子组件**:
- **ChatHeader**: 显示当前聊天对象信息
- **MessageList**: 消息列表容器
- **MessageInput**: 消息输入框和发送按钮

### 4. 消息组件 (Message)

**职责**: 渲染单条消息的气泡样式

**消息类型**:
- 自己的消息: 右对齐，主题色背景
- 他人消息: 左对齐，浅色背景
- 系统消息: 居中显示，特殊样式

**消息结构**:
```javascript
const message = {
  id: string,
  handle: string,
  text: string,
  timestamp: number,
  isSelf: boolean
}
```

### 5. 用户设置组件 (UserSettings)

**职责**: 处理用户信息设置和头像选择

**功能**:
- 用户名设置
- 头像选择（预设头像库）
- 设置持久化到localStorage

## 数据模型

### 用户模型 (User)
```javascript
class User {
  constructor(name, avatar) {
    this.id = this.generateId();
    this.name = name;
    this.avatar = avatar;
    this.isOnline = true;
    this.lastSeen = Date.now();
  }
  
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### 消息模型 (Message)
```javascript
class Message {
  constructor(handle, text, isSelf = false) {
    this.id = this.generateId();
    this.handle = handle;
    this.text = text;
    this.timestamp = Date.now();
    this.isSelf = isSelf;
  }
  
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### 聊天状态管理 (ChatState)
```javascript
class ChatState {
  constructor() {
    this.currentUser = null;
    this.users = new Map();
    this.messages = [];
    this.selectedUser = null;
  }
  
  addUser(user) { /* ... */ }
  removeUser(userId) { /* ... */ }
  addMessage(message) { /* ... */ }
  setCurrentUser(user) { /* ... */ }
}
```

## 错误处理

### WebSocket连接错误
- 显示连接状态指示器
- 自动重连机制
- 用户友好的错误提示

### 消息发送失败
- 消息发送状态指示（发送中、已发送、失败）
- 失败消息重发机制
- 离线消息队列

### 用户输入验证
- 用户名长度和字符限制
- 消息内容长度限制
- XSS防护（文本转义）

## 测试策略

### 单元测试
- 消息组件渲染测试
- 用户状态管理测试
- 工具函数测试

### 集成测试
- WebSocket连接和消息收发测试
- 用户界面交互测试
- 响应式布局测试

### 端到端测试
- 多用户聊天场景测试
- 设备兼容性测试
- 网络异常处理测试

### 性能测试
- 大量消息渲染性能
- 内存泄漏检测
- 移动端性能优化

## 设计规范

### 颜色方案
```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
  --background-color: #ffffff;
  --sidebar-bg: #f8f9fa;
  --message-bg-self: #007bff;
  --message-bg-other: #e9ecef;
  --border-color: #dee2e6;
}
```

### 字体规范
```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-size-base: 14px;
  --font-size-sm: 12px;
  --font-size-lg: 16px;
  --line-height: 1.5;
}
```

### 间距规范
```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --border-radius: 8px;
  --border-radius-sm: 4px;
  --border-radius-lg: 12px;
}
```

### 动画规范
```css
:root {
  --transition-fast: 0.15s ease-in-out;
  --transition-normal: 0.3s ease-in-out;
  --transition-slow: 0.5s ease-in-out;
}
```

## 响应式设计

### 断点定义
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### 布局适配
- **Desktop**: 双栏布局，固定侧边栏
- **Tablet**: 双栏布局，可折叠侧边栏
- **Mobile**: 单栏布局，底部导航切换

### 交互适配
- 触摸友好的按钮尺寸 (最小44px)
- 滑动手势支持
- 虚拟键盘适配

## 性能优化

### 消息渲染优化
- 虚拟滚动处理大量消息
- 消息懒加载
- 图片懒加载

### 内存管理
- 消息数量限制（最多保留1000条）
- 定期清理DOM节点
- 事件监听器清理

### 网络优化
- WebSocket心跳检测
- 消息压缩
- 离线缓存策略

## 可访问性

### 键盘导航
- Tab键导航支持
- 快捷键支持（Enter发送消息）
- 焦点管理

### 屏幕阅读器支持
- 语义化HTML标签
- ARIA标签支持
- 消息朗读支持

### 视觉辅助
- 高对比度模式支持
- 字体大小调节
- 色盲友好的颜色方案