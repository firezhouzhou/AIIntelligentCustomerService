# AIIntelligentCustomerService 系统架构说明

## 📐 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端应用 (React + TypeScript)              │
│                  http://localhost:5173                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  第9章       │  │  第12章      │  │  第14章      │      │
│  │  多模型对话  │  │  上下文感知  │  │  知识库RAG   │      │
│  │  :8009      │  │  :8012      │  │  :8014      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                  │               │
└─────────┼─────────────────┼──────────────────┼───────────────┘
          │                 │                  │
          │ SSE流式通信     │ HTTP API         │ HTTP API + JWT
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  后端服务 (Spring Boot)                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  chapter_09  │  │ chapter_12   │  │ chapter_14   │      │
│  │  流式对话    │  │ 上下文管理   │  │ 知识库RAG    │      │
│  │  :8009      │  │  :8012      │  │  :8014      │      │
│  └──────────────┘  └──────────────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         ▼                 ▼                  ▼               │
│  ┌────────────────────────────────────────────────┐         │
│  │          通义千问 API (DashScope)              │         │
│  │  - qwen-plus (对话模型)                        │         │
│  │  - text-embedding-v2 (向量化模型)              │         │
│  └────────────────────────────────────────────────┘         │
│                                      │                       │
│                                      ▼                       │
│                            ┌──────────────────┐             │
│                            │  MySQL Database  │             │
│                            │  knowledge_base  │             │
│                            │  _rag            │             │
│                            └──────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 第14章核心架构（重点）

### 前端架构

```
src/
├── components/
│   ├── AuthPage.tsx              # 登录注册页面
│   │   ├── 注册表单
│   │   ├── 登录表单
│   │   └── 表单验证
│   │
│   ├── ProtectedRoute.tsx        # 路由保护
│   │   ├── 检查登录状态
│   │   ├── 未登录跳转
│   │   └── 保存跳转前路径
│   │
│   ├── KnowledgeBase.tsx         # 知识库管理
│   │   ├── 知识库列表
│   │   ├── 文档上传
│   │   ├── 文档列表
│   │   └── 状态轮询
│   │
│   └── KnowledgeChat.tsx         # 智能问答
│       ├── 知识库选择
│       ├── 消息列表
│       ├── Markdown渲染
│       └── 代码高亮
│
├── services/
│   └── chapter14Service.ts       # API服务
│       ├── Token管理
│       ├── 认证接口
│       ├── 知识库接口
│       ├── 文档接口
│       └── 聊天接口
│
└── App.tsx                        # 路由配置
    ├── /auth - 登录注册
    ├── /chapter_14 - 知识库问答（需登录）
    └── /chapter_14/kb - 知识库管理（需登录）
```

### 后端架构

```
chapter_14/
├── controller/                    # 控制层
│   ├── AuthController            # 认证接口
│   │   ├── POST /auth/register   # 用户注册
│   │   └── POST /auth/login      # 用户登录
│   │
│   ├── KnowledgeBaseController   # 知识库管理
│   │   ├── GET    /knowledge-base         # 列表
│   │   ├── GET    /knowledge-base/{id}    # 详情
│   │   ├── POST   /knowledge-base         # 创建
│   │   ├── PUT    /knowledge-base/{id}    # 更新
│   │   └── DELETE /knowledge-base/{id}    # 删除
│   │
│   ├── DocumentController        # 文档管理
│   │   ├── GET    /documents?knowledgeBaseId=1  # 列表
│   │   ├── POST   /documents/upload             # 上传
│   │   ├── GET    /documents/{id}/status        # 状态
│   │   └── DELETE /documents/{id}               # 删除
│   │
│   └── ChatController            # RAG问答
│       └── POST /chat/send       # 发送问题
│
├── service/                       # 业务层
│   ├── DocumentService           # 文档处理
│   │   ├── uploadDocument()      # 上传处理
│   │   ├── processDocumentAsync() # 异步向量化
│   │   └── parseDocument()       # 文档解析
│   │
│   ├── VectorService             # 向量服务
│   │   ├── generateEmbedding()   # 文本向量化
│   │   └── cosineSimilarity()    # 相似度计算
│   │
│   └── RAGService                # RAG服务
│       ├── chat()                # 问答主流程
│       ├── retrieveRelevantChunks() # 检索相关块
│       └── generateAnswer()      # 生成回答
│
├── security/                      # 安全配置
│   ├── SecurityConfig            # Spring Security
│   └── JwtAuthenticationFilter   # JWT过滤器
│
├── repository/                    # 数据访问
│   ├── UserRepository
│   ├── KnowledgeBaseRepository
│   ├── DocumentRepository
│   └── DocumentChunkRepository
│
└── model/                         # 实体类
    ├── User                       # 用户
    ├── KnowledgeBase             # 知识库
    ├── Document                  # 文档
    └── DocumentChunk             # 文档分块
```

---

## 🔄 核心流程

### 1. 用户认证流程

```
用户注册
  ↓
POST /api/auth/register
  ↓
密码 BCrypt 加密
  ↓
保存到 users 表
  ↓
返回成功消息
  
用户登录
  ↓
POST /api/auth/login
  ↓
验证用户名密码
  ↓
生成 JWT Token（有效期7天）
  ↓
前端存储 Token 到 localStorage
  ↓
后续请求携带 Token（Authorization: Bearer xxx）
```

### 2. 文档上传处理流程

```
用户选择文件
  ↓
POST /api/documents/upload (multipart/form-data)
  ↓
【同步】DocumentService.uploadDocument()
  │
  ├─ 1. 验证文件格式和大小
  ├─ 2. 解析文档内容（PDF/Word/TXT/MD）
  ├─ 3. 智能文本分块
  │     ├─ 识别 Q&A 格式
  │     └─ 固定长度分块（500字符，重叠50）
  ├─ 4. 保存 Document 记录（status: pending）
  └─ 5. 触发异步任务 ──┐
                        │
立即返回响应             │
  ↓                     ↓
前端收到文档ID      【异步】processDocumentAsync()
  ↓                     │
开始状态轮询            ├─ 1. 更新状态为 processing
  ↓                     ├─ 2. 逐个分块向量化（调用通义千问）
每3秒请求状态           ├─ 3. 保存 DocumentChunk 和向量
  ↓                     └─ 4. 更新状态为 completed
状态更新为 completed
  ↓
处理完成，可用于问答
```

### 3. RAG问答流程

```
用户输入问题
  ↓
POST /api/chat/send
  {
    "knowledgeBaseId": 1,
    "question": "这个产品的主要功能是什么？"
  }
  ↓
【RAGService.chat()】
  ↓
1. 问题向量化
   VectorService.generateEmbedding(question)
   ↓ 返回 1536 维向量
  
2. 向量检索（从数据库）
   SELECT * FROM document_chunks
   WHERE document_id IN (知识库的文档)
   ↓ 获取所有分块及其向量
  
3. 计算相似度
   for each chunk:
     similarity = cosineSimilarity(questionVector, chunkVector)
   ↓ 排序取 Top-5（相似度 > 0.3）
  
4. 构建增强提示词
   context = [chunk1.content, chunk2.content, ...]
   prompt = """
   系统提示：你是智能客服助手...
   
   参考资料：
   [context]
   
   用户问题：
   [question]
   """
  
5. 调用 LLM 生成回答
   通义千问 qwen-plus
   ↓ 返回回答
  
6. 返回给前端
   {
     "success": true,
     "data": {
       "answer": "根据知识库文档，该产品的主要功能包括..."
     }
   }
```

---

## 🔐 安全机制

### JWT 认证流程

```
1. 登录成功
   ↓
2. 生成 JWT Token
   - 包含：username, 签发时间, 过期时间
   - 使用 HMAC-SHA256 签名
   - 有效期：7天
   ↓
3. 返回给前端
   ↓
4. 前端存储（localStorage）
   - key: chapter14_token
   - key: chapter14_user
   ↓
5. 后续请求携带
   - Header: Authorization: Bearer {token}
   ↓
6. 后端验证
   - JwtAuthenticationFilter 拦截
   - 验证签名
   - 检查过期时间
   - 提取用户信息
   - 设置 SecurityContext
   ↓
7. 业务层使用
   - @AuthenticationPrincipal 获取当前用户
   - 根据用户ID过滤数据
```

### 路由保护

```
前端：
  访问 /chapter_14 或 /chapter_14/kb
    ↓
  ProtectedRoute 组件检查
    ↓
  isLoggedIn() 检查 localStorage 中的 Token
    ↓
  ├─ 有 Token → 允许访问
  └─ 无 Token → 跳转到 /auth（保存原路径）

后端：
  受保护的 API 端点
    ↓
  Spring Security 配置
    ↓
  JwtAuthenticationFilter 拦截
    ↓
  ├─ Token 有效 → 继续处理
  └─ Token 无效/缺失 → 返回 401 Unauthorized
```

---

## 💾 数据库设计

### 表结构

```sql
-- 用户表
users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  password VARCHAR(255),     -- BCrypt加密
  email VARCHAR(100),
  role VARCHAR(20),          -- ROLE_USER
  enabled BOOLEAN,
  created_at TIMESTAMP
)

-- 知识库表
knowledge_bases (
  id BIGINT PRIMARY KEY,
  name VARCHAR(200),
  description TEXT,
  user_id BIGINT,            -- 外键关联 users.id
  document_count INT,        -- 文档数量
  vector_count INT,          -- 向量块数量
  is_public BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- 文档表
documents (
  id BIGINT PRIMARY KEY,
  knowledge_base_id BIGINT,  -- 外键关联 knowledge_bases.id
  file_name VARCHAR(500),
  file_type VARCHAR(20),     -- pdf/docx/txt/md
  file_size BIGINT,
  content LONGTEXT,          -- 完整内容
  status VARCHAR(20),        -- pending/processing/completed/failed
  chunk_count INT,           -- 分块数量
  error_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- 文档分块表（向量存储）
document_chunks (
  id BIGINT PRIMARY KEY,
  document_id BIGINT,        -- 外键关联 documents.id
  chunk_index INT,           -- 分块序号
  content TEXT,              -- 分块内容
  vector TEXT,               -- 1536维向量（逗号分隔字符串）
  created_at TIMESTAMP
)
```

### 数据隔离

- 每个用户只能访问自己创建的知识库
- 通过 `user_id` 字段实现数据隔离
- 查询时自动过滤：`WHERE user_id = ?`

---

## 🚀 技术栈总结

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3.1 | UI框架 |
| TypeScript | 5.x | 类型安全 |
| React Router | 7.12.0 | 路由管理 |
| React Markdown | 9.1.0 | Markdown渲染 |
| React Syntax Highlighter | 15.6.6 | 代码高亮 |
| Vite | 6.x | 构建工具 |

### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Spring Boot | 3.2.x | 应用框架 |
| Spring Security | 6.x | 安全认证 |
| Spring Data JPA | 3.x | 数据访问 |
| MySQL | 8.0+ | 关系型数据库 |
| JWT (jjwt) | 0.12.x | Token认证 |
| 通义千问 SDK | - | AI能力 |
| Apache PDFBox | 3.0.x | PDF解析 |
| Apache POI | 5.2.x | Word解析 |
| Swagger | 2.x | API文档 |

---

## 📊 性能优化

### 1. 异步处理
- 文档向量化采用异步任务（@Async）
- 上传立即返回，后台处理
- 避免长时间阻塞用户

### 2. 状态轮询
- 前端每3秒轮询处理中的文档
- 仅轮询未完成的文档
- 完成后停止轮询

### 3. 向量检索优化
- 使用余弦相似度快速计算
- Top-K限制（默认5个）
- 相似度阈值过滤（0.3）

### 4. 前端优化
- 路由懒加载
- 组件按需渲染
- 消息列表虚拟滚动（可扩展）

---

## 🔧 配置说明

### 前端配置

**vite.config.ts**
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8014',
    changeOrigin: true,
  }
}
```

### 后端配置

**application.yml**
```yaml
server:
  port: 8014

jwt:
  secret: [密钥]          # 生产环境必须修改
  expiration: 604800     # 7天

ai:
  rag:
    top-k: 5             # Top-K检索
    similarity-threshold: 0.3  # 相似度阈值

document:
  chunk:
    size: 500            # 分块大小
    overlap: 50          # 重叠大小
```

---

## 🎯 扩展方向

### 功能扩展
1. **流式问答**：支持SSE流式返回回答
2. **多文件批量上传**：并发上传多个文件
3. **向量数据库**：使用 Milvus/Pinecone 替代 MySQL
4. **知识库共享**：支持公开知识库
5. **问答历史**：保存问答记录到数据库
6. **多用户协作**：知识库成员管理

### 性能优化
1. **缓存机制**：Redis缓存常用查询
2. **向量索引**：使用 FAISS 加速检索
3. **分布式处理**：Kafka + 多worker处理文档
4. **CDN加速**：静态资源CDN分发

### 体验优化
1. **OCR识别**：支持扫描件PDF
2. **图片识别**：支持图片中的文字
3. **语音输入**：语音转文字提问
4. **多语言**：支持中英文切换

---

## 📝 总结

该系统是一个功能完整、架构清晰的企业级RAG应用，展示了：

✅ **完整的认证授权体系**  
✅ **异步任务处理模式**  
✅ **向量检索与RAG技术**  
✅ **前后端分离架构**  
✅ **良好的代码组织结构**  

可作为学习和实践的优秀范例！🎉
