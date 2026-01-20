import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  getKnowledgeBases,
  sendChatMessage,
  KnowledgeBase,
} from '../services/chapter14Service';
import './KnowledgeChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface KnowledgeChatProps {
  onManageClick: () => void;
}

export default function KnowledgeChat({ onManageClick }: KnowledgeChatProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingKbs, setLoadingKbs] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadKnowledgeBases = async () => {
    setLoadingKbs(true);
    try {
      const result = await getKnowledgeBases();
      if (result.success && result.data) {
        setKnowledgeBases(result.data);
        // 自动选择第一个知识库
        if (result.data.length > 0 && !selectedKb) {
          setSelectedKb(result.data[0]);
        }
      }
    } catch (err) {
      console.error('加载知识库失败:', err);
    } finally {
      setLoadingKbs(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedKb || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
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
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    try {
      const result = await sendChatMessage(selectedKb.id, userMessage.content);
      
      if (result.success && result.data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: result.data!.answer }
              : msg
          )
        );
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
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
      // 移除点踩
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
      // 移除点赞
      const newLiked = new Set(likedIds);
      newLiked.delete(messageId);
      setLikedIds(newLiked);
    }
    setDislikedIds(newDisliked);
  };

  const handleShare = (content: string) => {
    console.log('分享消息:', content);
    alert('分享功能待实现');
  };

  const handleRetry = () => {
    console.log('重试消息');
    alert('重试功能待实现');
  };

  return (
    <div className="knowledge-chat-container">
      {/* 左侧知识库列表 */}
      <div className="kb-sidebar">
        <div className="sidebar-header">
          <h3>知识库列表</h3>
          <button className="btn-manage" onClick={onManageClick}>
            管理
          </button>
        </div>

        {loadingKbs ? (
          <div className="loading-kbs">
            <span className="spinner-small"></span>
            加载中...
          </div>
        ) : knowledgeBases.length === 0 ? (
          <div className="empty-kbs">
            <span className="empty-icon">📂</span>
            <p>暂无知识库</p>
            <button className="btn-create" onClick={onManageClick}>
              创建知识库
            </button>
          </div>
        ) : (
          <div className="kb-list">
            {knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                className={`kb-item ${selectedKb?.id === kb.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedKb(kb);
                  clearChat();
                }}
              >
                <div className="kb-icon">📚</div>
                <div className="kb-info">
                  <div className="kb-name">{kb.name}</div>
                  <div className="kb-stats">
                    {kb.documentCount} 文档 | {kb.vectorCount} 向量
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <button className="btn-refresh" onClick={loadKnowledgeBases}>
            🔄 刷新列表
          </button>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="chat-main">
        {/* 聊天头部 */}
        <div className="chat-header">
          <div className="header-info">
            <h3>
              {selectedKb ? (
                <>
                  <span className="header-icon">💬</span>
                  {selectedKb.name}
                </>
              ) : (
                '请选择知识库'
              )}
            </h3>
            {selectedKb && (
              <span className="header-desc">{selectedKb.description || '暂无描述'}</span>
            )}
          </div>
          {messages.length > 0 && (
            <button className="btn-clear" onClick={clearChat}>
              清空对话
            </button>
          )}
        </div>

        {/* 消息列表 */}
        <div className="messages-container">
          {!selectedKb ? (
            <div className="no-kb-selected">
              <span className="notice-icon">👈</span>
              <h3>请从左侧选择一个知识库</h3>
              <p>选择知识库后，您可以基于该知识库中的文档进行智能问答</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="welcome-area">
              <div className="welcome-icon">🤖</div>
              <h2>欢迎使用知识库问答</h2>
              <p>
                当前知识库：<strong>{selectedKb.name}</strong>
              </p>
              <p>您可以询问与知识库文档相关的任何问题</p>
              <div className="example-questions">
                <h4>示例问题：</h4>
                <div className="question-tags">
                  <span onClick={() => setInput('这个知识库包含哪些主要内容？')}>
                    这个知识库包含哪些主要内容？
                  </span>
                  <span onClick={() => setInput('请总结一下文档的核心要点')}>
                    请总结一下文档的核心要点
                  </span>
                  <span onClick={() => setInput('帮我解释一下相关的概念')}>
                    帮我解释一下相关的概念
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-body">
                    <div className="message-bubble">
                      {msg.role === 'assistant' ? (
                        msg.content ? (
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
                        ) : (
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        )
                      ) : (
                        msg.content
                      )}
                    </div>
                    
                    {/* 客服消息的操作按钮栏 */}
                    {msg.role === 'assistant' && msg.content && (
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
                        <button 
                          className="action-btn"
                          onClick={() => handleShare(msg.content)}
                          title="分享"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                          </svg>
                        </button>
                        <button 
                          className="action-btn"
                          onClick={handleRetry}
                          title="重试"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
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

        {/* 输入区域 */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedKb ? '输入您的问题，按 Enter 发送...' : '请先选择知识库'}
              disabled={!selectedKb || loading}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!selectedKb || !input.trim() || loading}
            >
              {loading ? (
                <span className="spinner-small"></span>
              ) : (
                <span>发送</span>
              )}
            </button>
          </div>
          <div className="input-hint">
            <span>基于知识库文档的RAG智能问答</span>
            <span>端口：8014</span>
          </div>
        </div>
      </div>
    </div>
  );
}
