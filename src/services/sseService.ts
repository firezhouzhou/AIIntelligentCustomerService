/**
 * SSE (Server-Sent Events) 服务
 * 
 * 用于处理与后端的流式通信
 */

import { API_ENDPOINTS } from './api';
import { ChatRequest, ChatResponse } from '../types/chat';

/**
 * SSE聊天服务类
 * 
 * 使用fetch API发送POST请求，并处理SSE响应流
 * 注意：标准的EventSource只支持GET请求，
 * 这里使用fetch + ReadableStream来实现POST请求的SSE
 */
export class SSEChatService {
  private abortController: AbortController | null = null;

  /**
   * 发送聊天消息并接收流式响应
   * 
   * @param request 聊天请求
   * @param onMessage 收到消息时的回调
   * @param onComplete 完成时的回调
   * @param onError 错误时的回调
   */
  async sendMessage(
    request: ChatRequest,
    onMessage: (content: string) => void,
    onComplete: (sessionId: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    // 如果有正在进行的请求，先取消
    this.abort();
    
    this.abortController = new AbortController();

    try {
      const response = await fetch(API_ENDPOINTS.CHAT_STREAM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let sessionId = request.sessionId || '';

      // 读取流数据
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete(sessionId);
          break;
        }

        // 解码数据
        const chunk = decoder.decode(value, { stream: true });
        
        // 解析SSE数据
        // SSE格式: data: {...}\n\n
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const jsonStr = line.slice(5).trim();
              if (jsonStr) {
                const data: ChatResponse = JSON.parse(jsonStr);
                sessionId = data.sessionId;
                
                if (data.type === 'text' && data.content) {
                  onMessage(data.content);
                } else if (data.type === 'done') {
                  onComplete(sessionId);
                  return;
                } else if (data.type === 'error') {
                  onError(new Error(data.content));
                  return;
                }
              }
            } catch (e) {
              // 忽略解析错误，可能是不完整的数据块
              console.debug('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      onError(error as Error);
    }
  }

  /**
   * 取消当前请求
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// 导出单例实例
export const sseService = new SSEChatService();
