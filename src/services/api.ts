/**
 * API服务配置
 */

// API基础URL - 开发环境通过Vite代理，生产环境需要配置实际地址
export const API_BASE_URL = import.meta.env.PROD 
  ? 'http://localhost:8089' 
  : '';

// API端点
export const API_ENDPOINTS = {
  // SSE流式聊天
  CHAT_STREAM: `${API_BASE_URL}/api/chat/stream`,
  // 创建会话
  CREATE_SESSION: `${API_BASE_URL}/api/chat/session`,
  // 获取会话消息
  GET_MESSAGES: (sessionId: string) => `${API_BASE_URL}/api/chat/session/${sessionId}/messages`,
  // 获取用户会话列表
  GET_SESSIONS: `${API_BASE_URL}/api/chat/sessions`,
  // 关闭会话
  CLOSE_SESSION: (sessionId: string) => `${API_BASE_URL}/api/chat/session/${sessionId}/close`,
  // 健康检查
  HEALTH: `${API_BASE_URL}/api/chat/health`,
};
