/**
 * 上下文感知客服服务 (chapter_12 - 端口8012)
 */

const API_BASE = 'http://localhost:8012/api/chat';

export interface Scene {
  code: string;
  name: string;
  description: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  scene: string;
  type: string;
  template: string;
  variables?: string[];
  examples?: { userInput: string; assistantOutput: string }[];
  description: string;
}

export interface ChatMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  turnIndex?: number;
  createdAt?: string;
}

export interface SessionInfo {
  sessionId: string;
  turnCount: number;
  compressionCount: number;
  contextSummary?: string;
  keyInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
  userId?: string;
  scene?: string;
  modelId?: string;
  useCompression?: boolean;
  customSystemPrompt?: string;
}

export interface ChatResponseEvent {
  type: 'text' | 'done' | 'error';
  content?: string;
  sessionId?: string;
  contextTurns?: number;
  compressionUsed?: boolean;
  processingTime?: number;
}

/**
 * 获取场景列表
 */
export async function fetchScenes(): Promise<Scene[]> {
  const response = await fetch(`${API_BASE}/scenes`);
  const result = await response.json();
  return result.data;
}

/**
 * 获取提示词模板列表
 */
export async function fetchTemplates(): Promise<PromptTemplate[]> {
  const response = await fetch(`${API_BASE}/templates`);
  const result = await response.json();
  return result.data;
}

/**
 * 获取单个模板
 */
export async function fetchTemplate(templateId: string): Promise<PromptTemplate> {
  const response = await fetch(`${API_BASE}/templates/${templateId}`);
  const result = await response.json();
  return result.data;
}

/**
 * 预览组装后的提示词
 */
export async function previewPrompt(scene: string, contextSummary?: string, keyInfo?: string): Promise<string> {
  const response = await fetch(`${API_BASE}/templates/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, contextSummary, keyInfo })
  });
  const result = await response.json();
  return result.data;
}

/**
 * 获取对话历史
 */
export async function fetchHistory(sessionId: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE}/history/${sessionId}`);
  const result = await response.json();
  return result.data;
}

/**
 * 获取会话上下文信息
 */
export async function fetchContext(sessionId: string): Promise<SessionInfo> {
  const response = await fetch(`${API_BASE}/context/${sessionId}`);
  const result = await response.json();
  return result.data;
}

/**
 * 手动压缩对话
 */
export async function compressConversation(sessionId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/compress/${sessionId}`, {
    method: 'POST'
  });
  const result = await response.json();
  return result.data;
}

/**
 * 流式聊天
 */
export async function streamChat(
  request: ChatRequest,
  onMessage: (content: string) => void,
  onComplete: (sessionId: string, contextTurns: number, compressionUsed: boolean, processingTime: number) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    console.log('[8012] streamChat request', {
      sessionId: request.sessionId,
      scene: request.scene,
      useCompression: request.useCompression,
      hasCustomPrompt: !!request.customSystemPrompt
    });
    const response = await fetch(`${API_BASE}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      console.error('[8012] streamChat response not ok', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('[8012] streamChat connected', response.status);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // 解析SSE事件
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        // 解析SSE事件
        const lines = eventBlock.split(/\r?\n/);
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            // 移除 "data:" 前缀
            const value = line.slice(5);
            eventData += (value.startsWith(' ') ? value.slice(1) : value);
          } else if (line.startsWith('data :')) {
            // 处理 "data :" 格式（冒号前有空格）
            const value = line.slice(6);
            eventData += (value.startsWith(' ') ? value.slice(1) : value);
          }
        }

        if (eventData) {
          try {
            // 打印前3个事件的原始数据用于调试
            if (eventCount < 3) {
              console.log('[8012] 原始eventData:', eventData.substring(0, 200));
            }
            
            // 尝试解析后端的特殊格式
            // 格式: data:[{...}, {"data": "{\"content\":\"文本\",\"type\":\"text\"}"}, {...}]
            let event: ChatResponseEvent;
            const parsed = JSON.parse(eventData);
            
            if (Array.isArray(parsed)) {
              // 后端返回的是数组格式，真正的数据在第二个元素的data字段
              console.log('[8012] 检测到数组格式，元素数量:', parsed.length);
              
              // 查找包含实际数据的元素（mediaType为null的那个）
              const dataElement = parsed.find(item => item.mediaType === null);
              if (dataElement && dataElement.data) {
                console.log('[8012] 找到数据元素:', dataElement.data);
                // 再次解析内部的JSON
                event = JSON.parse(dataElement.data);
              } else {
                console.warn('[8012] 未找到有效数据元素');
                continue;
              }
            } else {
              // 标准格式
              event = parsed;
            }
            
            eventCount += 1;
            if (eventCount <= 3 || event.type === 'done' || event.type === 'error') {
              console.log('[8012] SSE event', event.type, {
                hasContent: !!event.content,
                contentLength: event.content?.length,
                sessionId: event.sessionId
              });
            }
            
            switch (event.type) {
              case 'text':
                if (event.content) {
                  onMessage(event.content);
                }
                break;
              case 'done':
                onComplete(
                  event.sessionId || '',
                  event.contextTurns || 0,
                  event.compressionUsed || false,
                  event.processingTime || 0
                );
                break;
              case 'error':
                onError(new Error(event.content || '未知错误'));
                break;
            }
          } catch (e) {
            console.error('[8012] 解析SSE事件失败:', e, '原始数据:', eventData.substring(0, 200));
          }
        }
      }
    }
  } catch (error) {
    console.error('[8012] streamChat error', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}
