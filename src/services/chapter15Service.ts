/**
 * Chapter 15 - 多模态智能客服平台服务API
 * 后端端口: 8015
 */

const API_BASE = 'http://localhost:8015/api';

// ============= 类型定义 =============

// 消息类型枚举
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file';

// 会话状态枚举（兼容大小写）
export type SessionStatus = 'WAITING' | 'BOT_SERVING' | 'AGENT_SERVING' | 'CLOSED' | 'TRANSFERRING'
  | 'waiting' | 'bot_serving' | 'agent_serving' | 'closed' | 'transferring';

// 客服状态枚举
export type AgentStatus = 'online' | 'offline' | 'busy' | 'away';

// 消息请求
export interface MessageRequest {
  sessionId?: string;
  userId: number;
  knowledgeBaseId: number;
  content: string;
  messageType?: MessageType;
  mediaUrl?: string;
}

// 消息响应
export interface MessageResponse {
  sessionId: string;
  answer: string;
  confidence: number;
  fromRag: boolean;
  status: SessionStatus;
  agentId?: number;
}

// 会话消息
export interface SessionMessage {
  id: number;
  sessionId: string;
  messageType: MessageType;
  senderType: 'user' | 'bot' | 'agent' | 'system';
  senderId?: number;
  content: string;
  confidence?: number;
  fromRag: boolean;
  relatedChunkIds?: string;
  createdTime: string;
  isRead: boolean;
}

// 转接请求
export interface TransferRequest {
  sessionId: string;
  reason?: string;
}

// 转接响应
export interface TransferResponse {
  success: boolean;
  routeTo: string;
  reason: string;
  agentId?: number;
  agentName?: string;
}

// 关闭会话请求
export interface CloseSessionRequest {
  sessionId: string;
  satisfactionScore?: number;
}

// 人工客服消息请求
export interface AgentMessageRequest {
  sessionId: string;
  agentId: number;
  content: string;
}

// 客服信息
export interface CustomerServiceAgent {
  id: number;
  agentCode: string;
  agentName: string;
  status: AgentStatus;
  currentSessions: number;
  maxSessions: number;
  totalSessions: number;
  avgSatisfaction: number;
  avgResponseTime: number;
  skills: string;
  createdTime: string;
}

// 会话统计
export interface SessionStats {
  totalSessions: number;
  botSessions: number;
  agentSessions: number;
  transferRate: number;
  avgSatisfaction: number;
  avgSessionDuration: number;
}

// 客服绩效
export interface AgentPerformance {
  agentId: number;
  agentName: string;
  totalSessions: number;
  avgResponseTime: number;
  avgSatisfaction: number;
  totalWorkingHours: number;
}

// 热门问题
export interface HotQuestion {
  question: string;
  count: number;
  percentage: number;
}

// 会话报告
export interface SessionReport {
  sessionId: string;
  userId: number;
  startTime: string;
  endTime: string;
  duration: number;
  messageCount: number;
  status: SessionStatus;
  satisfactionScore?: number;
  transferCount: number;
  agentId?: number;
  agentName?: string;
}

// 实时监控数据
export interface RealtimeMonitor {
  onlineAgents: number;
  activeSessions: number;
  waitingQueue: number;
  avgWaitTime: number;
  messagesPerMinute: number;
  systemLoad: number;
}

// API响应包装
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

// ============= Token管理 =============

const TOKEN_KEY = 'chapter15_token';
const USER_KEY = 'chapter15_user';

export interface User {
  id?: number;
  username: string;
  email?: string;
  token?: string;
}

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const setStoredUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// ============= 请求工具函数 =============

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  try {
    const data = await response.json();
    
    if (!response.ok) {
      return {
        code: response.status,
        message: data.message || `请求失败 (${response.status})`,
        data: undefined as unknown as T,
        timestamp: Date.now()
      };
    }
    
    return data;
  } catch (error) {
    return {
      code: 500,
      message: '服务器响应格式错误',
      data: undefined as unknown as T,
      timestamp: Date.now()
    };
  }
};

// ============= 认证接口 =============

export const register = async (
  username: string,
  password: string,
  email: string
): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: '',
      timestamp: Date.now()
    };
  }
};

export const login = async (
  username: string,
  password: string
): Promise<ApiResponse<{ token: string; username: string; email: string }>> => {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    const result = await handleResponse<{ token: string; username: string; email: string }>(response);
    
    if (result.code === 200 && result.data) {
      setToken(result.data.token);
      setStoredUser({
        username: result.data.username,
        email: result.data.email,
        token: result.data.token,
      });
    }
    
    return result;
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: { token: '', username: '', email: '' },
      timestamp: Date.now()
    };
  }
};

export const logout = (): void => {
  removeToken();
};

export const isLoggedIn = (): boolean => {
  return !!getToken();
};

// ============= 多模态聊天接口 =============

/**
 * 发送消息
 */
export const sendMessage = async (request: MessageRequest): Promise<ApiResponse<MessageResponse>> => {
  try {
    const response = await fetch(`${API_BASE}/multimodal-chat/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    return handleResponse<MessageResponse>(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as MessageResponse,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取会话消息历史
 */
export const getSessionMessages = async (sessionId: string): Promise<ApiResponse<SessionMessage[]>> => {
  try {
    const response = await fetch(`${API_BASE}/multimodal-chat/messages/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 转接人工客服
 */
export const transferToAgent = async (request: TransferRequest): Promise<ApiResponse<TransferResponse>> => {
  try {
    const response = await fetch(`${API_BASE}/multimodal-chat/transfer-to-agent`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as TransferResponse,
      timestamp: Date.now()
    };
  }
};

/**
 * 人工客服发送消息
 */
export const agentSendMessage = async (request: AgentMessageRequest): Promise<ApiResponse<SessionMessage>> => {
  try {
    const response = await fetch(`${API_BASE}/multimodal-chat/agent/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as SessionMessage,
      timestamp: Date.now()
    };
  }
};

/**
 * 结束会话
 */
export const closeSession = async (request: CloseSessionRequest): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch(`${API_BASE}/multimodal-chat/close`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: '',
      timestamp: Date.now()
    };
  }
};

// ============= 数据分析接口 =============

/**
 * 获取会话统计
 */
export const getSessionStats = async (startDate: string, endDate: string): Promise<ApiResponse<SessionStats>> => {
  try {
    const response = await fetch(
      `${API_BASE}/analytics/sessions/stats?startDate=${startDate}&endDate=${endDate}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as SessionStats,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取客服绩效
 */
export const getAgentPerformance = async (startDate: string, endDate: string): Promise<ApiResponse<AgentPerformance[]>> => {
  try {
    const response = await fetch(
      `${API_BASE}/analytics/agents/performance?startDate=${startDate}&endDate=${endDate}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 获取热门问题
 */
export const getHotQuestions = async (
  startDate: string,
  endDate: string,
  topN: number = 10
): Promise<ApiResponse<HotQuestion[]>> => {
  try {
    const response = await fetch(
      `${API_BASE}/analytics/questions/hot?startDate=${startDate}&endDate=${endDate}&topN=${topN}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 生成会话报告
 */
export const getSessionReport = async (sessionId: string): Promise<ApiResponse<SessionReport>> => {
  try {
    const response = await fetch(`${API_BASE}/analytics/sessions/${sessionId}/report`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as SessionReport,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取实时监控数据
 */
export const getRealtimeMonitor = async (): Promise<ApiResponse<RealtimeMonitor>> => {
  try {
    const response = await fetch(`${API_BASE}/analytics/realtime/monitor`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as RealtimeMonitor,
      timestamp: Date.now()
    };
  }
};

// ============= 客服管理接口 =============

/**
 * 创建客服
 */
export const createAgent = async (agent: Partial<CustomerServiceAgent>): Promise<ApiResponse<CustomerServiceAgent>> => {
  try {
    const response = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(agent),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as CustomerServiceAgent,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取所有客服
 */
export const getAllAgents = async (): Promise<ApiResponse<CustomerServiceAgent[]>> => {
  try {
    const response = await fetch(`${API_BASE}/agents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 获取在线客服
 */
export const getOnlineAgents = async (): Promise<ApiResponse<CustomerServiceAgent[]>> => {
  try {
    const response = await fetch(`${API_BASE}/agents/online`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 更新客服状态
 */
export const updateAgentStatus = async (id: number, status: AgentStatus): Promise<ApiResponse<CustomerServiceAgent>> => {
  try {
    const response = await fetch(`${API_BASE}/agents/${id}/status?status=${status}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as CustomerServiceAgent,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取客服详情
 */
export const getAgentDetail = async (id: number): Promise<ApiResponse<CustomerServiceAgent>> => {
  try {
    const response = await fetch(`${API_BASE}/agents/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as CustomerServiceAgent,
      timestamp: Date.now()
    };
  }
};

/**
 * 删除客服
 */
export const deleteAgent = async (id: number): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch(`${API_BASE}/agents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: '',
      timestamp: Date.now()
    };
  }
};

// ============= 客服工作台接口 =============

// 会话信息
export interface CustomerSession {
  id: number;
  sessionId: string;
  userId: number;
  knowledgeBaseId: number;
  status: SessionStatus;
  agentId?: number;
  messageCount: number;
  botConfidence: number;
  satisfactionScore?: number;
  startTime: string;
  endTime?: string;
  lastActivityTime: string;
}

/**
 * 获取等待人工处理的会话列表
 */
export const getWaitingSessions = async (): Promise<ApiResponse<CustomerSession[]>> => {
  try {
    const response = await fetch(`${API_BASE}/agent-workspace/sessions/waiting`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 获取客服的活跃会话列表
 */
export const getAgentActiveSessions = async (agentId: number): Promise<ApiResponse<CustomerSession[]>> => {
  try {
    const response = await fetch(`${API_BASE}/agent-workspace/sessions/agent/${agentId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 获取所有活跃会话
 */
export const getAllActiveSessions = async (): Promise<ApiResponse<CustomerSession[]>> => {
  try {
    const response = await fetch(`${API_BASE}/agent-workspace/sessions/active`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

/**
 * 客服接入会话
 */
export const acceptSession = async (sessionId: string, agentId: number): Promise<ApiResponse<CustomerSession>> => {
  try {
    const response = await fetch(`${API_BASE}/agent-workspace/sessions/${sessionId}/accept?agentId=${agentId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as CustomerSession,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取会话详情
 */
export const getSessionDetail = async (sessionId: string): Promise<ApiResponse<CustomerSession>> => {
  try {
    const response = await fetch(`${API_BASE}/agent-workspace/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: {} as CustomerSession,
      timestamp: Date.now()
    };
  }
};

/**
 * 获取会话消息历史（工作台专用）
 */
export const getWorkspaceSessionMessages = async (sessionId: string): Promise<ApiResponse<SessionMessage[]>> => {
  try {
    const response = await fetch(`${API_BASE}/agent-workspace/sessions/${sessionId}/messages`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  } catch (error) {
    return {
      code: 500,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: [],
      timestamp: Date.now()
    };
  }
};

// ============= 健康检查 =============

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
};
