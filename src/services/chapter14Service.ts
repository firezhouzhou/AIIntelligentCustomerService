/**
 * Chapter 14 - 知识库RAG服务API
 * 后端端口: 8014
 */

const API_BASE = 'http://localhost:8014/api';

// ============= 类型定义 =============

export interface User {
  id?: number;
  username: string;
  email?: string;
  token?: string;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description: string;
  documentCount: number;
  vectorCount: number;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: number;
  knowledgeBaseId: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount: number;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ChatResponse {
  answer: string;
}

// ============= Token管理 =============

const TOKEN_KEY = 'chapter14_token';
const USER_KEY = 'chapter14_user';

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
    
    // 如果响应不 ok，返回失败
    if (!response.ok) {
      return {
        success: false,
        message: data.message || `请求失败 (${response.status})`,
        data: undefined
      };
    }
    
    // 后端返回格式适配
    // 后端可能返回 { code: 200, message: "...", data: {...} }
    // 或者 { success: true, data: {...} }
    if ('code' in data) {
      // 后端使用 code 字段（Spring Boot 统一响应格式）
      return {
        success: data.code === 200,
        message: data.message,
        data: data.data
      };
    }
    
    // 前端期望格式
    return data;
  } catch (error) {
    // JSON 解析失败
    return {
      success: false,
      message: '服务器响应格式错误',
      data: undefined
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
    console.log('📝 开始注册请求:', { username, email });
    
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });
    
    console.log('📡 注册响应状态:', response.status, response.statusText);
    
    const result = await handleResponse<string>(response);
    
    console.log('📦 注册结果:', result);
    
    return result;
  } catch (error) {
    console.error('💥 注册请求异常:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: undefined
    };
  }
};

export const login = async (
  username: string,
  password: string
): Promise<ApiResponse<{ token: string; username: string; email: string }>> => {
  try {
    console.log('🔐 开始登录请求:', { username, apiUrl: `${API_BASE}/auth/login` });
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    
    console.log('📡 登录响应状态:', response.status, response.statusText);
    
    const result = await handleResponse<{ token: string; username: string; email: string }>(response);
    
    console.log('📦 登录结果处理后:', result);
    
    if (result.success && result.data) {
      console.log('✅ 登录成功！保存 Token:', result.data.token.substring(0, 20) + '...');
      setToken(result.data.token);
      setStoredUser({
        username: result.data.username,
        email: result.data.email,
        token: result.data.token,
      });
      console.log('💾 Token 已保存到 localStorage');
      console.log('👤 用户信息:', { username: result.data.username, email: result.data.email });
    } else {
      console.warn('❌ 登录失败:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('💥 登录请求异常:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '网络请求失败',
      data: undefined
    };
  }
};

export const logout = (): void => {
  removeToken();
};

export const isLoggedIn = (): boolean => {
  return !!getToken();
};

// ============= 知识库接口 =============

export const getKnowledgeBases = async (): Promise<ApiResponse<KnowledgeBase[]>> => {
  const response = await fetch(`${API_BASE}/knowledge-base`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const getKnowledgeBase = async (id: number): Promise<ApiResponse<KnowledgeBase>> => {
  const response = await fetch(`${API_BASE}/knowledge-base/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createKnowledgeBase = async (
  name: string,
  description: string
): Promise<ApiResponse<KnowledgeBase>> => {
  const response = await fetch(`${API_BASE}/knowledge-base`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description }),
  });
  return handleResponse(response);
};

export const updateKnowledgeBase = async (
  id: number,
  name: string,
  description: string
): Promise<ApiResponse<KnowledgeBase>> => {
  const response = await fetch(`${API_BASE}/knowledge-base/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description }),
  });
  return handleResponse(response);
};

export const deleteKnowledgeBase = async (id: number): Promise<ApiResponse<string>> => {
  const response = await fetch(`${API_BASE}/knowledge-base/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ============= 文档接口 =============

export const getDocuments = async (knowledgeBaseId: number): Promise<ApiResponse<Document[]>> => {
  const response = await fetch(`${API_BASE}/documents?knowledgeBaseId=${knowledgeBaseId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const uploadDocument = async (
  knowledgeBaseId: number,
  file: File
): Promise<ApiResponse<Document>> => {
  const formData = new FormData();
  formData.append('knowledgeBaseId', knowledgeBaseId.toString());
  formData.append('file', file);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handleResponse(response);
};

export const getDocumentStatus = async (id: number): Promise<ApiResponse<Document>> => {
  const response = await fetch(`${API_BASE}/documents/${id}/status`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

export const deleteDocument = async (id: number): Promise<ApiResponse<string>> => {
  const response = await fetch(`${API_BASE}/documents/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// ============= 聊天接口 =============

export const sendChatMessage = async (
  knowledgeBaseId: number,
  question: string
): Promise<ApiResponse<ChatResponse>> => {
  const response = await fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ knowledgeBaseId, question }),
  });
  return handleResponse(response);
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
