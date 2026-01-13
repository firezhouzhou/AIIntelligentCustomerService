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
      
      // 缓冲区：用于存储跨chunk的不完整数据
      let buffer = '';

      // 读取流数据
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // 处理缓冲区中剩余的数据
          if (buffer.trim()) {
            this.processBuffer(buffer, (data) => {
              sessionId = data.sessionId || sessionId;
              if (data.type === 'text' && data.content) {
                onMessage(data.content);
              }
            });
          }
          onComplete(sessionId);
          break;
        }

        // 解码数据并追加到缓冲区
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 处理完整的SSE事件
        // SSE事件以 \n\n 或 \r\n\r\n 分隔
        const eventEndPattern = /\r?\n\r?\n/;
        let eventEnd = buffer.search(eventEndPattern);

        while (eventEnd !== -1) {
          // 提取一个完整的事件
          const eventData = buffer.substring(0, eventEnd);
          // 找到实际的分隔符长度
          const match = buffer.match(eventEndPattern);
          const separatorLength = match ? match[0].length : 2;
          buffer = buffer.substring(eventEnd + separatorLength);

          // 解析事件
          const result = this.parseSSEEvent(eventData);
          if (result) {
            sessionId = result.sessionId || sessionId;
            
            if (result.type === 'text' && result.content) {
              onMessage(result.content);
            } else if (result.type === 'done') {
              onComplete(sessionId);
              return;
            } else if (result.type === 'error') {
              onError(new Error(result.content));
              return;
            }
          }

          // 继续查找下一个事件
          eventEnd = buffer.search(eventEndPattern);
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
   * 解析单个SSE事件
   */
  private parseSSEEvent(eventStr: string): ChatResponse | null {
    const lines = eventStr.split(/\r?\n/);
    let data = '';
    
    for (const line of lines) {
      // SSE格式: field: value
      // 我们主要关注 data 字段
      if (line.startsWith('data:')) {
        // data字段可能有多行，需要拼接
        const value = line.slice(5); // 移除 "data:" 前缀
        // 不要trim，保留原始空格，只移除开头的一个空格（如果有）
        data += (value.startsWith(' ') ? value.slice(1) : value);
      } else if (line.startsWith('data :')) {
        // 处理 "data :" 格式（冒号前有空格）
        const value = line.slice(6);
        data += (value.startsWith(' ') ? value.slice(1) : value);
      }
    }

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as ChatResponse;
    } catch (e) {
      console.debug('JSON parse error:', e, 'Data:', data);
      return null;
    }
  }

  /**
   * 处理缓冲区中的数据
   */
  private processBuffer(buffer: string, callback: (data: ChatResponse) => void): void {
    const lines = buffer.split(/\r?\n/);
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr) as ChatResponse;
            callback(data);
          } catch (e) {
            console.debug('Buffer parse error:', e);
          }
        }
      }
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
