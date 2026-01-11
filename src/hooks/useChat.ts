/**
 * 聊天Hook - 管理聊天状态和逻辑
 */

import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatRequest } from '../types/chat';
import { sseService } from '../services/sseService';

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  stopGeneration: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // 用于累积AI响应
  const assistantMessageRef = useRef<string>('');

  /**
   * 发送消息
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    assistantMessageRef.current = '';

    // 添加用户消息
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      status: 'sent',
    };

    // 添加AI消息占位符
    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);

    // 构建请求
    const request: ChatRequest = {
      sessionId: sessionId || undefined,
      message: content.trim(),
      userId: 'anonymous',
    };

    try {
      await sseService.sendMessage(
        request,
        // onMessage - 收到新内容
        (text) => {
          assistantMessageRef.current += text;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: assistantMessageRef.current }
                : msg
            )
          );
        },
        // onComplete - 完成
        (newSessionId) => {
          setSessionId(newSessionId);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, status: 'sent' }
                : msg
            )
          );
          setIsLoading(false);
        },
        // onError - 错误
        (err) => {
          setError(err.message);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: '抱歉，发生了错误：' + err.message, status: 'error' }
                : msg
            )
          );
          setIsLoading(false);
        }
      );
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }, [sessionId, isLoading]);

  /**
   * 清空消息
   */
  const clearMessages = useCallback(() => {
    sseService.abort();
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * 停止生成
   */
  const stopGeneration = useCallback(() => {
    sseService.abort();
    setIsLoading(false);
    // 更新最后一条消息的状态
    setMessages(prev => 
      prev.map((msg, index) => 
        index === prev.length - 1 && msg.role === 'assistant'
          ? { ...msg, status: 'sent' }
          : msg
      )
    );
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    clearMessages,
    stopGeneration,
  };
}
