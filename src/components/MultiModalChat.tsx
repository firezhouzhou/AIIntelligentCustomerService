import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  sendMessage,
  getSessionMessages,
  transferToAgent,
  closeSession,
  MessageRequest,
  SessionMessage,
  MessageType,
  SessionStatus,
} from '../services/chapter15Service';
import './MultiModalChat.css';

interface Message {
  id: string;
  role: 'user' | 'bot' | 'agent';
  content: string;
  timestamp: Date;
  messageType: MessageType;
  confidence?: number;
  fromRag?: boolean;
}

interface MultiModalChatProps {
  onNavigate: (page: 'analytics' | 'agents') => void;
}

export default function MultiModalChat({ onNavigate }: MultiModalChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('BOT_SERVING');
  const [error, setError] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 加载历史消息
  const loadHistory = async (sid: string) => {
    try {
      const result = await getSessionMessages(sid);
      if (result.code === 200 && result.data) {
        const historyMessages: Message[] = result.data.map((msg: SessionMessage) => ({
          id: msg.id.toString(),
          role: msg.senderType,
          content: msg.content,
          timestamp: new Date(msg.createdTime),
          messageType: msg.messageType,
          confidence: msg.confidence,
          fromRag: msg.fromRag,
        }));
        setMessages(historyMessages);
      }
    } catch (err) {
      console.error('加载历史消息失败:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      messageType: messageType,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    // 添加助手的占位消息
    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'bot',
        content: '',
        timestamp: new Date(),
        messageType: 'text',
      },
    ]);

    try {
      const request: MessageRequest = {
        sessionId: sessionId || undefined,
        userId: 1, // 默认用户ID
        knowledgeBaseId: 1, // 默认知识库ID
        content: userMessage.content,
        messageType: messageType,
        mediaUrl: showMediaInput && mediaUrl ? mediaUrl : undefined,
      };

      const result = await sendMessage(request);

      if (result.code === 200 && result.data) {
        const responseData = result.data;
        
        // 保存会话ID
        if (!sessionId && responseData.sessionId) {
          setSessionId(responseData.sessionId);
        }
        if (responseData.status) {
          setSessionStatus(responseData.status as SessionStatus);
        }

        // 获取回答内容，确保不是 null 或 undefined
        const answerContent = responseData.answer || '抱歉，未能获取到回答内容。';
        const confidenceValue = responseData.confidence;
        const fromRagValue = responseData.fromRag ?? false;
        
        // 更新消息状态
        setMessages((prevMessages) => {
          const newMessages: Message[] = [];
          
          for (const msg of prevMessages) {
            if (msg.id === assistantMsgId) {
              newMessages.push({
                id: msg.id,
                role: msg.role,
                content: answerContent,
                timestamp: msg.timestamp,
                messageType: msg.messageType,
                confidence: confidenceValue,
                fromRag: fromRagValue,
              });
            } else {
              newMessages.push(msg);
            }
          }
          
          return newMessages;
        });
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: '抱歉，获取回答时出错了。' + (result.message || '') }
              : msg
          )
        );
        setError(result.message || '请求失败');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '请求失败';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: '抱歉，发生错误：' + errorMsg }
            : msg
        )
      );
      setError(errorMsg);
    } finally {
      setLoading(false);
      setMessageType('text');
      setMediaUrl('');
      setShowMediaInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTransfer = async () => {
    if (!sessionId) {
      setError('请先开始对话');
      return;
    }

    try {
      const result = await transferToAgent({
        sessionId,
        reason: '用户主动请求转接人工客服',
      });

      if (result.code === 200 && result.data) {
        setSessionStatus('AGENT_SERVING');
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'bot',
            content: `已为您转接人工客服：${result.data.agentName || '客服'}，请稍候...`,
            timestamp: new Date(),
            messageType: 'text',
          },
        ]);
      } else {
        setError(result.message || '转接失败');
      }
    } catch (err) {
      setError('转接请求失败');
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    setShowRatingModal(true);
  };

  const confirmCloseSession = async () => {
    if (!sessionId) return;

    try {
      const result = await closeSession({
        sessionId,
        satisfactionScore: rating,
      });

      if (result.code === 200) {
        setShowRatingModal(false);
        setSessionStatus('CLOSED');
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'bot',
            content: `会话已结束，感谢您的评价（${rating}分）！如有需要，请开启新对话。`,
            timestamp: new Date(),
            messageType: 'text',
          },
        ]);
      } else {
        setError(result.message || '关闭会话失败');
      }
    } catch (err) {
      setError('关闭会话失败');
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(null);
    setSessionStatus('BOT_SERVING');
    setError('');
  };

  const handleCopy = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleLike = (messageId: string) => {
    const newLiked = new Set(likedIds);
    if (newLiked.has(messageId)) {
      newLiked.delete(messageId);
    } else {
      newLiked.add(messageId);
      const newDisliked = new Set(dislikedIds);
      newDisliked.delete(messageId);
      setDislikedIds(newDisliked);
    }
    setLikedIds(newLiked);
  };

  const handleDislike = (messageId: string) => {
    const newDisliked = new Set(dislikedIds);
    if (newDisliked.has(messageId)) {
      newDisliked.delete(messageId);
    } else {
      newDisliked.add(messageId);
      const newLiked = new Set(likedIds);
      newLiked.delete(messageId);
      setLikedIds(newLiked);
    }
    setDislikedIds(newDisliked);
  };

  const getStatusText = () => {
    const status = sessionStatus?.toLowerCase();
    switch (status) {
      case 'bot_serving':
        return '智能客服服务中';
      case 'agent_serving':
        return '人工客服服务中';
      case 'waiting':
        return '等待中';
      case 'closed':
        return '会话已结束';
      default:
        return '就绪';
    }
  };

  const getStatusColor = () => {
    const status = sessionStatus?.toLowerCase();
    switch (status) {
      case 'bot_serving':
        return 'status-bot';
      case 'agent_serving':
        return 'status-agent';
      case 'waiting':
        return 'status-waiting';
      case 'closed':
        return 'status-closed';
      default:
        return '';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return '👤';
      case 'bot':
        return '🤖';
      case 'agent':
        return '👨‍💼';
      default:
        return '💬';
    }
  };

  return (
    <div className="multimodal-chat-container">
      {/* 侧边栏 */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>功能导航</h3>
        </div>

        <div className="nav-menu">
          <div className="nav-item active">
            <span className="nav-icon">💬</span>
            <span>智能对话</span>
          </div>
          <div className="nav-item" onClick={() => onNavigate('analytics')}>
            <span className="nav-icon">📊</span>
            <span>数据分析</span>
          </div>
          <div className="nav-item" onClick={() => onNavigate('agents')}>
            <span className="nav-icon">👥</span>
            <span>客服管理</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h4>会话状态</h4>
          <div className={`status-badge ${getStatusColor()}`}>
            <span className="status-dot"></span>
            {getStatusText()}
          </div>
          {sessionId && (
            <div className="session-info">
              <span className="info-label">会话ID:</span>
              <span className="info-value">{sessionId.slice(0, 12)}...</span>
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <h4>消息类型</h4>
          <div className="message-type-selector">
            {(['text', 'image', 'audio', 'file'] as MessageType[]).map((type) => (
              <button
                key={type}
                className={`type-btn ${messageType === type ? 'active' : ''}`}
                onClick={() => {
                  setMessageType(type);
                  setShowMediaInput(type !== 'text');
                }}
              >
                {type === 'text' && '📝'}
                {type === 'image' && '🖼️'}
                {type === 'audio' && '🎵'}
                {type === 'file' && '📎'}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-actions">
          <button
            className="btn-transfer"
            onClick={handleTransfer}
            disabled={!sessionId || sessionStatus?.toLowerCase() === 'agent_serving' || sessionStatus?.toLowerCase() === 'closed'}
          >
            👨‍💼 转人工客服
          </button>
          <button
            className="btn-close-session"
            onClick={handleCloseSession}
            disabled={!sessionId || sessionStatus?.toLowerCase() === 'closed'}
          >
            ✅ 结束会话
          </button>
          <button className="btn-new-chat" onClick={clearChat}>
            ➕ 新建对话
          </button>
        </div>
      </div>

      {/* 聊天主区域 */}
      <div className="chat-main">
        {/* 聊天头部 */}
        <div className="chat-header">
          <div className="header-info">
            <h3>
              <span className="header-icon">💬</span>
              多模态智能客服
            </h3>
            <span className="header-desc">支持文本、图片、语音、文件等多种消息类型</span>
          </div>
          {messages.length > 0 && (
            <button className="btn-clear" onClick={clearChat}>
              清空对话
            </button>
          )}
        </div>

        {/* 消息列表 */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-area">
              <div className="welcome-icon">🤖</div>
              <h2>欢迎使用多模态智能客服</h2>
              <p>支持文本、图片、语音、文件等多种消息类型</p>
              <div className="feature-list">
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span>智能RAG问答</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">👨‍💼</span>
                  <span>人工客服转接</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <span>数据分析统计</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⭐</span>
                  <span>满意度评价</span>
                </div>
              </div>
              <div className="example-questions">
                <h4>试着问问：</h4>
                <div className="question-tags">
                  <span onClick={() => setInput('这个商品是正品吗？')}>
                    这个商品是正品吗？
                  </span>
                  <span onClick={() => setInput('怎么退货？')}>
                    怎么退货？
                  </span>
                  <span onClick={() => setInput('物流多久能到？')}>
                    物流多久能到？
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-avatar">{getRoleIcon(msg.role)}</div>
                  <div className="message-body">
                    <div className="message-bubble">
                      {msg.role !== 'user' ? (
                        msg.content && msg.content.trim() ? (
                          <>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                code({ className, children, ...props }) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const inline = !match;
                                  return !inline && match ? (
                                    <SyntaxHighlighter
                                      style={oneDark}
                                      language={match[1]}
                                      PreTag="div"
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                            {msg.confidence !== undefined && (
                              <div className="message-meta">
                                <span className="confidence-badge">
                                  置信度: {(msg.confidence * 100).toFixed(0)}%
                                </span>
                                {msg.fromRag && (
                                  <span className="rag-badge">基于知识库</span>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        )
                      ) : (
                        <>
                          {msg.content}
                          {msg.messageType !== 'text' && (
                            <span className="message-type-badge">{msg.messageType}</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* 消息操作按钮 */}
                    {msg.role !== 'user' && msg.content && (
                      <div className="message-actions">
                        <button
                          className={`action-btn ${copiedId === msg.id ? 'active' : ''}`}
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="复制"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                        <button
                          className={`action-btn ${likedIds.has(msg.id) ? 'active liked' : ''}`}
                          onClick={() => handleLike(msg.id)}
                          title="点赞"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={likedIds.has(msg.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                        </button>
                        <button
                          className={`action-btn ${dislikedIds.has(msg.id) ? 'active disliked' : ''}`}
                          onClick={() => handleDislike(msg.id)}
                          title="点踩"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={dislikedIds.has(msg.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
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

        {/* 媒体URL输入 */}
        {showMediaInput && (
          <div className="media-input-area">
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={`请输入${messageType === 'image' ? '图片' : messageType === 'audio' ? '音频' : '文件'}URL`}
              className="media-url-input"
            />
            <button className="btn-cancel-media" onClick={() => setShowMediaInput(false)}>
              取消
            </button>
          </div>
        )}

        {/* 输入区域 */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={sessionStatus?.toLowerCase() === 'closed' ? '会话已结束，请开启新对话' : '输入您的问题，按 Enter 发送...'}
              disabled={loading || sessionStatus?.toLowerCase() === 'closed'}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || loading || sessionStatus?.toLowerCase() === 'closed'}
            >
              {loading ? (
                <span className="spinner-small"></span>
              ) : (
                <span>发送</span>
              )}
            </button>
          </div>
          <div className="input-hint">
            <span>多模态智能客服 · 支持文本/图片/语音/文件</span>
            <span>端口：8015</span>
          </div>
        </div>
      </div>

      {/* 评分弹窗 */}
      {showRatingModal && (
        <div className="modal-overlay">
          <div className="rating-modal">
            <h3>请对本次服务评分</h3>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= rating ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ⭐
                </span>
              ))}
            </div>
            <p className="rating-text">
              {rating === 5 && '非常满意'}
              {rating === 4 && '满意'}
              {rating === 3 && '一般'}
              {rating === 2 && '不满意'}
              {rating === 1 && '非常不满意'}
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRatingModal(false)}>
                取消
              </button>
              <button className="btn-confirm" onClick={confirmCloseSession}>
                提交评价
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
}
