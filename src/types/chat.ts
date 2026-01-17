/**
 * 聊天相关类型定义
 */

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

// 会话类型
export interface ChatSession {
  sessionId: string;
  userId?: string;
  title: string;
  status: 'active' | 'closed';
  createdAt: Date;
  lastActiveAt: Date;
}

// 模型信息
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

// 聊天请求
export interface ChatRequest {
  sessionId?: string;
  message: string;
  userId?: string;
  modelId?: string;  // 选择的模型ID
}

// SSE响应
export interface ChatResponse {
  sessionId: string;
  content: string;
  type: 'text' | 'done' | 'error';
  timestamp: string;
}

// API响应包装
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
