# AI智能客服前端

> 第9章综合案例：前后端分离的客服聊天平台 - React客户端

## 项目简介

这是一个基于 React + TypeScript + Vite 构建的AI智能客服前端应用，通过 SSE (Server-Sent Events) 技术实现与后端的实时流式通信。

## 技术栈

- **React 18** - 用户界面库
- **TypeScript** - 类型安全
- **Vite** - 下一代前端构建工具
- **SSE** - 服务器推送事件，实现流式响应

## 项目结构

```
AIIntelligentCustomerService/
├── public/
│   └── chat-icon.svg          # 网站图标
├── src/
│   ├── components/            # React组件
│   │   ├── ChatWindow.tsx     # 聊天窗口主组件
│   │   ├── Header.tsx         # 头部组件
│   │   ├── MessageList.tsx    # 消息列表组件
│   │   ├── MessageInput.tsx   # 消息输入组件
│   │   └── *.css              # 组件样式
│   ├── hooks/
│   │   └── useChat.ts         # 聊天状态管理Hook
│   ├── services/
│   │   ├── api.ts             # API配置
│   │   └── sseService.ts      # SSE服务
│   ├── types/
│   │   └── chat.ts            # TypeScript类型定义
│   ├── App.tsx                # 根组件
│   ├── App.css
│   ├── index.css              # 全局样式
│   └── main.tsx               # 入口文件
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

### SSE 流式响应

- 使用 fetch API + ReadableStream 实现 POST 请求的 SSE
- 支持实时接收AI响应，逐字显示
- 支持中断生成

### 聊天功能

- 发送/接收消息
- 会话历史管理
- 消息状态跟踪（发送中/已发送/错误）
- 自动滚动到最新消息

### UI/UX

- 现代化响应式设计
- 打字动画效果
- 移动端适配
- 快捷问题按钮

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

确保后端服务（chapter_09）运行在 `http://localhost:8089`

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
