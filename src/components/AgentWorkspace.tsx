import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getWaitingSessions,
  getAllActiveSessions,
  getWorkspaceSessionMessages,
  acceptSession,
  getAllAgents,
  CustomerSession,
  SessionMessage,
  CustomerServiceAgent,
} from '../services/chapter15Service';
import wsService, { WsMessage, WorkspaceNotification } from '../services/websocketService';
import './AgentWorkspace.css';

interface AgentWorkspaceProps {
  onNavigate: (page: 'chat' | 'analytics' | 'agents') => void;
}

export default function AgentWorkspace({ onNavigate }: AgentWorkspaceProps) {
  // 会话列表
  const [waitingSessions, setWaitingSessions] = useState<CustomerSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<CustomerSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CustomerSession | null>(null);
  
  // 消息相关
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // 客服相关
  const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<CustomerServiceAgent | null>(null);
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'waiting' | 'active'>('waiting');
  const [wsConnected, setWsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscribedSessionRef = useRef<string | null>(null);

  // 处理收到的 WebSocket 消息
  const handleWsMessage = useCallback((wsMsg: WsMessage) => {
    console.log('工作台收到消息:', wsMsg);
    
    // 转换为 SessionMessage 格式
    const newMessage: SessionMessage = {
      id: wsMsg.id || Date.now(),
      sessionId: wsMsg.sessionId,
      messageType: (wsMsg.messageType as SessionMessage['messageType']) || 'text',
      senderType: wsMsg.senderType,
      senderId: wsMsg.senderId,
      content: wsMsg.content,
      confidence: wsMsg.confidence,
      fromRag: wsMsg.fromRag || false,
      createdTime: wsMsg.timestamp,
    };

    // 添加新消息，避免重复
    setMessages((prev) => {
      const exists = prev.some(m => 
        m.content === newMessage.content && 
        m.senderType === newMessage.senderType &&
        Math.abs(new Date(m.createdTime).getTime() - new Date(newMessage.createdTime).getTime()) < 5000
      );
      if (exists) return prev;
      return [...prev, newMessage];
    });
  }, []);

  // 处理工作台通知（新会话等）
  const handleWorkspaceNotification = useCallback((notification: WorkspaceNotification) => {
    console.log('工作台通知:', notification);
    
    if (notification.type === 'new_session') {
      // 有新会话，刷新等待列表
      loadSessions();
    } else if (notification.type === 'session_accepted') {
      // 会话被接入，刷新列表
      loadSessions();
    } else if (notification.type === 'session_closed') {
      // 会话关闭，刷新列表
      loadSessions();
      if (selectedSession?.sessionId === notification.sessionId) {
        setSelectedSession(null);
        setMessages([]);
      }
    }
  }, [selectedSession]);

  // 初始化：连接 WebSocket
  useEffect(() => {
    loadAgents();
    loadSessions();
    
    // 连接 WebSocket
    wsService.connect(
      () => {
        console.log('工作台 WebSocket 连接成功');
        setWsConnected(true);
        // 订阅工作台通知
        wsService.subscribeToWorkspace(handleWorkspaceNotification);
      },
      (err) => {
        console.error('工作台 WebSocket 连接失败:', err);
        setWsConnected(false);
      }
    );

    return () => {
      // 清理订阅
      if (subscribedSessionRef.current) {
        wsService.unsubscribeFromSession(subscribedSessionRef.current);
      }
      wsService.disconnect();
    };
  }, [handleWorkspaceNotification]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgents = async () => {
    try {
      const result = await getAllAgents();
      if (result.code === 200 && result.data) {
        setAgents(result.data);
        // 默认选择第一个在线客服
        const onlineAgent = result.data.find(a => a.status === 'online');
        if (onlineAgent) {
          setCurrentAgent(onlineAgent);
        } else if (result.data.length > 0) {
          setCurrentAgent(result.data[0]);
        }
      }
    } catch (err) {
      console.error('加载客服列表失败:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const [waitingRes, activeRes] = await Promise.all([
        getWaitingSessions(),
        getAllActiveSessions()
      ]);

      if (waitingRes.code === 200) {
        setWaitingSessions(waitingRes.data || []);
      }
      if (activeRes.code === 200) {
        // 过滤出人工服务中的会话
        const agentSessions = (activeRes.data || []).filter(
          s => s.status?.toLowerCase() === 'agent_serving'
        );
        setActiveSessions(agentSessions);
      }
    } catch (err) {
      console.error('加载会话列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const result = await getWorkspaceSessionMessages(sessionId);
      if (result.code === 200 && result.data) {
        setMessages(result.data);
      }
    } catch (err) {
      console.error('加载消息失败:', err);
    }
  };

  const handleSelectSession = async (session: CustomerSession) => {
    // 取消之前的订阅
    if (subscribedSessionRef.current && subscribedSessionRef.current !== session.sessionId) {
      wsService.unsubscribeFromSession(subscribedSessionRef.current);
    }
    
    setSelectedSession(session);
    setMessages([]);
    
    // 加载历史消息
    await loadMessages(session.sessionId);
    
    // 订阅该会话的实时消息
    if (wsConnected) {
      wsService.subscribeToSession(session.sessionId, handleWsMessage);
      subscribedSessionRef.current = session.sessionId;
    }
  };

  const handleAcceptSession = async (session: CustomerSession) => {
    if (!currentAgent) {
      setError('请先选择客服账号');
      return;
    }

    try {
      const result = await acceptSession(session.sessionId, currentAgent.id);
      if (result.code === 200) {
        await loadSessions();
        setSelectedSession(result.data);
        await loadMessages(session.sessionId);
        setTab('active');
        
        // 订阅该会话的实时消息
        if (wsConnected) {
          if (subscribedSessionRef.current) {
            wsService.unsubscribeFromSession(subscribedSessionRef.current);
          }
          wsService.subscribeToSession(session.sessionId, handleWsMessage);
          subscribedSessionRef.current = session.sessionId;
        }
      } else {
        setError(result.message || '接入会话失败');
      }
    } catch (err) {
      setError('接入会话失败');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedSession || !currentAgent || sendingMessage) return;

    const content = inputMessage.trim();
    setInputMessage('');
    setError('');

    // 立即在本地显示消息（乐观更新）
    const localMessage: SessionMessage = {
      id: Date.now(),
      sessionId: selectedSession.sessionId,
      messageType: 'text',
      senderType: 'agent',
      senderId: currentAgent.id,
      content: content,
      fromRag: false,
      createdTime: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localMessage]);

    // 使用 WebSocket 发送消息
    if (wsConnected) {
      wsService.sendAgentMessage(
        selectedSession.sessionId,
        currentAgent.id,
        content,
        'text'
      );
    } else {
      setError('WebSocket 未连接，无法发送消息');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusText = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'waiting': return '等待中';
      case 'transferring': return '转接中';
      case 'bot_serving': return '机器人服务';
      case 'agent_serving': return '人工服务';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'waiting':
      case 'transferring':
        return 'status-waiting';
      case 'bot_serving':
        return 'status-bot';
      case 'agent_serving':
        return 'status-agent';
      case 'closed':
        return 'status-closed';
      default:
        return '';
    }
  };

  const getSenderName = (msg: SessionMessage) => {
    switch (msg.senderType) {
      case 'user': return '用户';
      case 'bot': return '智能客服';
      case 'agent': return '人工客服';
      case 'system': return '系统';
      default: return msg.senderType;
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'user': return '👤';
      case 'bot': return '🤖';
      case 'agent': return '👨‍💼';
      case 'system': return '📢';
      default: return '💬';
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  const displayedSessions = tab === 'waiting' ? waitingSessions : activeSessions;

  return (
    <div className="agent-workspace-container">
      {/* 左侧：会话列表 */}
      <div className="workspace-sidebar">
        <div className="sidebar-header">
          <h3>客服工作台</h3>
          {currentAgent && (
            <div className="current-agent">
              <span className="agent-avatar">{currentAgent.agentName.charAt(0)}</span>
              <span className="agent-name">{currentAgent.agentName}</span>
            </div>
          )}
        </div>

        {/* 客服选择 */}
        <div className="agent-selector">
          <label>当前客服</label>
          <select
            value={currentAgent?.id || ''}
            onChange={(e) => {
              const agent = agents.find(a => a.id === Number(e.target.value));
              setCurrentAgent(agent || null);
            }}
          >
            <option value="">选择客服</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.agentName} ({agent.status === 'online' ? '在线' : '离线'})
              </option>
            ))}
          </select>
        </div>

        {/* 标签页 */}
        <div className="session-tabs">
          <button
            className={`tab-btn ${tab === 'waiting' ? 'active' : ''}`}
            onClick={() => setTab('waiting')}
          >
            待接入
            {waitingSessions.length > 0 && (
              <span className="badge">{waitingSessions.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            服务中
            {activeSessions.length > 0 && (
              <span className="badge">{activeSessions.length}</span>
            )}
          </button>
        </div>

        {/* 会话列表 */}
        <div className="session-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner-small"></div>
              <span>加载中...</span>
            </div>
          ) : displayedSessions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">{tab === 'waiting' ? '📭' : '💬'}</span>
              <p>{tab === 'waiting' ? '暂无等待会话' : '暂无活跃会话'}</p>
            </div>
          ) : (
            displayedSessions.map(session => (
              <div
                key={session.sessionId}
                className={`session-item ${selectedSession?.sessionId === session.sessionId ? 'selected' : ''}`}
                onClick={() => handleSelectSession(session)}
              >
                <div className="session-info">
                  <div className="session-user">
                    <span className="user-icon">👤</span>
                    <span>用户 #{session.userId}</span>
                  </div>
                  <div className={`session-status ${getStatusColor(session.status)}`}>
                    {getStatusText(session.status)}
                  </div>
                </div>
                <div className="session-meta">
                  <span className="msg-count">💬 {session.messageCount} 条消息</span>
                  <span className="session-time">{formatTime(session.lastActivityTime)}</span>
                </div>
                {tab === 'waiting' && (
                  <button
                    className="btn-accept"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptSession(session);
                    }}
                  >
                    接入会话
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* 导航 */}
        <div className="sidebar-nav">
          <button onClick={() => onNavigate('chat')}>💬 用户端</button>
          <button onClick={() => onNavigate('analytics')}>📊 数据分析</button>
          <button onClick={() => onNavigate('agents')}>👥 客服管理</button>
        </div>
      </div>

      {/* 右侧：会话详情 */}
      <div className="workspace-main">
        {!selectedSession ? (
          <div className="no-session-selected">
            <span className="empty-icon">💬</span>
            <h3>选择一个会话开始处理</h3>
            <p>从左侧列表选择会话，查看历史消息并回复用户</p>
          </div>
        ) : (
          <>
            {/* 会话头部 */}
            <div className="chat-header">
              <div className="header-info">
                <h3>
                  <span className="user-icon">👤</span>
                  用户 #{selectedSession.userId}
                </h3>
                <div className="header-meta">
                  <span className={`status-tag ${getStatusColor(selectedSession.status)}`}>
                    {getStatusText(selectedSession.status)}
                  </span>
                  <span className="session-id">会话: {selectedSession.sessionId.slice(0, 8)}...</span>
                </div>
              </div>
              <div className="header-actions">
                <span className={`ws-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
                  {wsConnected ? '● 实时连接' : '○ 连接中...'}
                </span>
                <button className="btn-refresh" onClick={() => loadMessages(selectedSession.sessionId)}>
                  🔄 刷新
                </button>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <p>暂无消息记录</p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((msg, index) => (
                    <div
                      key={msg.id || index}
                      className={`message ${msg.senderType}`}
                    >
                      <div className="message-header">
                        <span className="sender-icon">{getSenderIcon(msg.senderType)}</span>
                        <span className="sender-name">{getSenderName(msg)}</span>
                        <span className="message-time">{formatTime(msg.createdTime)}</span>
                      </div>
                      <div className="message-content">
                        {msg.senderType === 'bot' || msg.senderType === 'system' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                        {msg.senderType === 'bot' && msg.confidence && (
                          <div className="message-meta">
                            <span className="confidence">置信度: {(msg.confidence * 100).toFixed(0)}%</span>
                            {msg.fromRag && <span className="rag-tag">基于知识库</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="error-banner">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')}>×</button>
              </div>
            )}

            {/* 输入区域 */}
            <div className="input-area">
              {selectedSession.status?.toLowerCase() === 'agent_serving' ? (
                <>
                  <div className="input-wrapper">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value);
                        // 自动调整高度
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="输入消息..."
                      disabled={sendingMessage}
                      rows={1}
                    />
                    <button
                      className="btn-send"
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || sendingMessage}
                      title="发送"
                    >
                      {sendingMessage ? '...' : '↑'}
                    </button>
                  </div>
                  <span className="input-hint">按 Enter 发送，Shift+Enter 换行</span>
                </>
              ) : (
                <div className="input-disabled">
                  <p>
                    {tab === 'waiting'
                      ? '请先接入会话后再进行回复'
                      : '该会话当前不在人工服务状态'}
                  </p>
                  {tab === 'waiting' && (
                    <button
                      className="btn-accept-large"
                      onClick={() => handleAcceptSession(selectedSession)}
                    >
                      接入此会话
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
