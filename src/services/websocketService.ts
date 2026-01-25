/**
 * WebSocket 服务
 * 用于实时消息通信
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// 开发环境使用代理，生产环境使用完整URL
const WS_URL = import.meta.env.DEV 
  ? '/ws/chat'  // 开发环境通过 vite proxy
  : 'http://localhost:8015/ws/chat';

// 消息类型
export interface WsMessage {
  id?: number;
  sessionId: string;
  senderType: 'user' | 'bot' | 'agent' | 'system';
  senderId?: number;
  content: string;
  messageType?: string;
  mediaUrl?: string;
  confidence?: number;
  fromRag?: boolean;
  timestamp: string;
}

// 状态变更通知
export interface StatusChangeNotification {
  type: 'status_change';
  sessionId: string;
  status: string;
  agentName?: string;
  timestamp: string;
}

// 工作台通知
export interface WorkspaceNotification {
  type: 'new_session' | 'session_accepted' | 'session_closed';
  sessionId: string;
  userId?: number;
  agentId?: number;
  agentName?: string;
  timestamp: string;
}

// 回调函数类型
type MessageCallback = (message: WsMessage) => void;
type StatusCallback = (notification: StatusChangeNotification) => void;
type WorkspaceCallback = (notification: WorkspaceNotification) => void;
type ErrorCallback = (error: unknown) => void;
type ConnectCallback = () => void;

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  
  // 回调
  private onConnectCallback: ConnectCallback | null = null;
  private onDisconnectCallback: ConnectCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  /**
   * 连接 WebSocket
   */
  connect(onConnect?: ConnectCallback, onError?: ErrorCallback): void {
    if (this.isConnected || this.client?.active) {
      console.log('WebSocket 已连接');
      onConnect?.();
      return;
    }

    this.onConnectCallback = onConnect || null;
    this.onErrorCallback = onError || null;

    console.log('正在连接 WebSocket...');

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      debug: (str) => {
        console.log('[STOMP]', str);
      },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket 连接成功');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onConnectCallback?.();
      },
      onDisconnect: () => {
        console.log('WebSocket 已断开');
        this.isConnected = false;
        this.onDisconnectCallback?.();
      },
      onStompError: (frame) => {
        console.error('STOMP 错误:', frame);
        this.onErrorCallback?.(frame);
      },
      onWebSocketError: (event) => {
        console.error('WebSocket 错误:', event);
        this.handleReconnect();
      },
    });

    this.client.activate();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.client) {
      // 取消所有订阅
      this.subscriptions.forEach((sub) => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.error('取消订阅失败:', e);
        }
      });
      this.subscriptions.clear();

      // 断开连接
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      console.log('WebSocket 已断开');
    }
  }

  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket 重连失败，已达最大尝试次数');
      this.onErrorCallback?.(new Error('重连失败'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`WebSocket 重连中... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(this.onConnectCallback || undefined, this.onErrorCallback || undefined);
    }, this.reconnectDelay);
  }

  /**
   * 订阅会话消息
   */
  subscribeToSession(sessionId: string, onMessage: MessageCallback): void {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket 未连接，无法订阅');
      return;
    }

    const topic = `/topic/chat/${sessionId}`;
    
    // 避免重复订阅
    if (this.subscriptions.has(topic)) {
      console.log('已订阅该会话:', sessionId);
      return;
    }

    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body) as WsMessage;
        console.log('收到消息:', data);
        onMessage(data);
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    });

    this.subscriptions.set(topic, subscription);
    console.log('已订阅会话:', sessionId);
  }

  /**
   * 取消订阅会话消息
   */
  unsubscribeFromSession(sessionId: string): void {
    const topic = `/topic/chat/${sessionId}`;
    const subscription = this.subscriptions.get(topic);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
      console.log('已取消订阅会话:', sessionId);
    }
  }

  /**
   * 订阅会话状态变更
   */
  subscribeToSessionStatus(sessionId: string, onStatusChange: StatusCallback): void {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket 未连接');
      return;
    }

    const topic = `/topic/chat/${sessionId}/status`;
    
    if (this.subscriptions.has(topic)) {
      return;
    }

    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body) as StatusChangeNotification;
        console.log('状态变更:', data);
        onStatusChange(data);
      } catch (e) {
        console.error('解析状态变更失败:', e);
      }
    });

    this.subscriptions.set(topic, subscription);
  }

  /**
   * 订阅工作台通知
   */
  subscribeToWorkspace(onNotification: WorkspaceCallback): void {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket 未连接');
      return;
    }

    const topic = '/topic/workspace/notifications';
    
    if (this.subscriptions.has(topic)) {
      return;
    }

    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body) as WorkspaceNotification;
        console.log('工作台通知:', data);
        onNotification(data);
      } catch (e) {
        console.error('解析工作台通知失败:', e);
      }
    });

    this.subscriptions.set(topic, subscription);
    console.log('已订阅工作台通知');
  }

  /**
   * 用户发送消息
   */
  sendUserMessage(sessionId: string, senderId: number, content: string, messageType?: string, mediaUrl?: string): void {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket 未连接，无法发送消息');
      return;
    }

    const message = {
      senderId,
      content,
      messageType: messageType || 'text',
      mediaUrl: mediaUrl || null,
    };

    this.client.publish({
      destination: `/app/chat/${sessionId}/user`,
      body: JSON.stringify(message),
    });

    console.log('用户消息已发送:', message);
  }

  /**
   * 客服发送消息
   */
  sendAgentMessage(sessionId: string, agentId: number, content: string, messageType?: string): void {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket 未连接，无法发送消息');
      return;
    }

    const message = {
      senderId: agentId,
      content,
      messageType: messageType || 'text',
    };

    this.client.publish({
      destination: `/app/chat/${sessionId}/agent`,
      body: JSON.stringify(message),
    });

    console.log('客服消息已发送:', message);
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 设置断开连接回调
   */
  onDisconnect(callback: ConnectCallback): void {
    this.onDisconnectCallback = callback;
  }
}

// 导出单例
export const wsService = new WebSocketService();
export default wsService;
