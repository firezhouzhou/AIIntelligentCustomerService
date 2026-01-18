# AI智能客服前端

> 多章节综合案例：前后端分离的AI智能客服平台 - React客户端

## 项目简介

这是一个基于 React + TypeScript + Vite 构建的AI智能客服前端应用，集成了多个功能模块：

- **第9章** - 多模型对话：通过 SSE 技术实现流式聊天，支持多种AI模型
- **第12章** - 上下文感知对话：智能记忆上下文的对话系统
- **第14章** - 知识库RAG问答：基于文档的检索增强生成，支持登录认证、文档上传管理

## 技术栈

- **React 18** - 用户界面库
- **TypeScript** - 类型安全
- **Vite** - 下一代前端构建工具
- **SSE** - 服务器推送事件，实现流式响应

## 项目结构

```
AIIntelligentCustomerService/
├── public/
│   └── chat-icon.svg               # 网站图标
├── src/
│   ├── components/                 # React组件
│   │   ├── ChatWindow.tsx          # 第9章：多模型对话窗口
│   │   ├── ContextAwareChat.tsx    # 第12章：上下文感知对话
│   │   ├── KnowledgeChat.tsx       # 第14章：知识库问答对话
│   │   ├── KnowledgeBase.tsx       # 第14章：知识库管理界面
│   │   ├── AuthPage.tsx            # 登录注册页面
│   │   ├── ProtectedRoute.tsx      # 路由保护组件
│   │   ├── Header.tsx              # 头部组件
│   │   ├── MessageList.tsx         # 消息列表组件
│   │   ├── MessageInput.tsx        # 消息输入组件
│   │   ├── ModelSelector.tsx       # 模型选择组件
│   │   └── *.css                   # 各组件样式
│   ├── hooks/
│   │   └── useChat.ts              # 聊天状态管理Hook
│   ├── services/                   # API服务层
│   │   ├── api.ts                  # 第9章API配置
│   │   ├── sseService.ts           # SSE流式通信服务
│   │   ├── contextChatService.ts   # 第12章上下文对话API
│   │   └── chapter14Service.ts     # 第14章知识库RAG API
│   ├── types/
│   │   └── chat.ts                 # TypeScript类型定义
│   ├── App.tsx                     # 根组件（路由管理）
│   ├── App.css                     # 全局样式
│   └── main.tsx                    # 入口文件
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 3. 构建生产版本

```bash
npm run build
```

## 功能特点

### 第9章 - 多模型对话（端口 8009）

- **SSE 流式响应**：使用 fetch API + ReadableStream 实现 POST 请求的 SSE
- **多模型支持**：可切换不同的AI模型进行对话
- **实时显示**：支持实时接收AI响应，逐字显示
- **中断生成**：支持随时中断AI回答

### 第12章 - 上下文感知对话（端口 8012）

- **上下文记忆**：智能记忆对话历史，理解上下文关系
- **会话管理**：支持创建、切换、删除多个会话
- **持久化存储**：会话历史本地存储

### 第14章 - 知识库RAG问答（端口 8014）✨

#### 🔐 认证系统
- **用户注册/登录**：支持用户注册和登录功能
- **JWT Token认证**：基于JWT的安全认证机制
- **自动跳转**：登录成功后自动跳转到原访问页面
- **路由保护**：使用 ProtectedRoute 保护需要登录的页面
- **跨标签页同步**：多标签页登录状态自动同步

#### 📚 知识库管理
- **创建知识库**：创建多个独立的知识库
- **知识库列表**：查看所有知识库及其统计信息
- **删除知识库**：删除不需要的知识库

#### 📄 文档上传管理
- **文档上传**：支持 PDF、Word、TXT、Markdown 格式
- **文件大小限制**：单个文件最大 10MB
- **文档列表**：查看已上传的所有文档
- **处理状态**：实时显示文档处理状态（等待处理/处理中/已完成/失败）
- **状态轮询**：自动刷新处理中的文档状态
- **删除文档**：删除不需要的文档
- **统计信息**：显示文档数量、向量块数量等

#### 💬 智能问答
- **基于RAG的问答**：使用检索增强生成技术回答问题
- **知识库选择**：可选择不同知识库进行问答
- **Markdown渲染**：支持Markdown格式的回答
- **代码高亮**：代码块自动语法高亮
- **对话历史**：保存完整的问答历史

### 通用UI/UX

- **现代化设计**：响应式布局，美观的用户界面
- **打字动画**：AI回答时的打字效果
- **移动端适配**：支持手机、平板等设备
- **快捷操作**：示例问题、清空对话等便捷功能

## 配置说明

### API代理配置

开发环境下，Vite 会将 `/api` 请求代理到后端服务器：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
      }
    }
  }
})
```

### 后端服务

确保对应的后端服务已启动：

- **第9章**：`http://localhost:8009` （SpringBootAIProject/chapter_09）
- **第12章**：`http://localhost:8012` （SpringBootAIProject/chapter_12）
- **第14章**：`http://localhost:8014` （SpringBootAIProject/chapter_14）

#### 第14章后端配置

1. **配置 MySQL 数据库**
   ```bash
   # 创建数据库
   CREATE DATABASE knowledge_base_rag;
   ```

2. **配置通义千问 API Key**
   ```bash
   # 设置环境变量
   export DASHSCOPE_API_KEY=your_api_key
   ```

3. **启动后端服务**
   ```bash
   cd SpringBootAIProject/chapter_14
   mvn spring-boot:run
   ```

4. **访问 Swagger 文档**
   ```
   http://localhost:8014/swagger-ui/index.html
   ```

## SSE 实现说明

标准的 `EventSource` API 只支持 GET 请求，本项目使用 `fetch` + `ReadableStream` 实现 POST 请求的 SSE：

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Accept': 'text/event-stream' },
  body: JSON.stringify(request),
});

const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // 处理数据...
}
```

## 浏览器兼容性

- Chrome 42+
- Firefox 41+
- Safari 10.1+
- Edge 79+

## License

MIT
