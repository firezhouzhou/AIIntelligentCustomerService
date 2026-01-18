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
                    <div className="message-content">
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
