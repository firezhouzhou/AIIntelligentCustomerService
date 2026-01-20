import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Scene,
  PromptTemplate,
  SessionInfo,
  fetchScenes,
  fetchTemplates,
  fetchContext,
  streamChat,
  compressConversation
} from '../services/contextChatService';
import './ContextAwareChat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ContextAwareChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState('general');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [useCompression, setUseCompression] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      loadSessionInfo();
    }
  }, [sessionId]);

  const loadInitialData = async () => {
    try {
      const [scenesData, templatesData] = await Promise.all([
        fetchScenes(),
        fetchTemplates()
      ]);
      setScenes(scenesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('加载初始数据失败:', error);
    }
  };

  const loadSessionInfo = async () => {
    if (!sessionId) return;
    try {
      const info = await fetchContext(sessionId);
      setSessionInfo(info);
    } catch (error) {
      console.error('加载会话信息失败:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    console.log('[8012] send message', {
      sessionId,
      scene: selectedScene,
      messageLength: userMessage.content.length,
      useCompression,
      hasCustomPrompt: !!customPrompt
    });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: ''
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      let hasContent = false;
      let accumulatedContent = '';
      
      await streamChat(
        {
          sessionId: sessionId || undefined,
          message: userMessage.content,
          scene: selectedScene,
          useCompression,
          customSystemPrompt: customPrompt || undefined
        },
        (content) => {
          console.debug('[8012] received chunk, length:', content.length, 'preview:', content.substring(0, 20));
          hasContent = true;
          accumulatedContent += content;
          
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = accumulatedContent;
            }
            return newMessages;
          });
        },
        (newSessionId, contextTurns, compressionUsed, processingTime) => {
          if (!sessionId) {
            setSessionId(newSessionId);
          }
          if (!hasContent) {
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg.role === 'assistant') {
                lastMsg.content = '抱歉，未收到模型返回内容，请检查后端日志或模型配置。';
              }
              return newMessages;
            });
            setIsLoading(false);
            return;
          }
          console.log('[8012] done', {
            sessionId: newSessionId,
            contextTurns,
            compressionUsed,
            processingTime
          });
          loadSessionInfo();
          console.log(`完成: 轮数=${contextTurns}, 压缩=${compressionUsed}, 耗时=${processingTime}ms`);
        },
        (error) => {
          console.error('[8012] streamChat error', error);
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg.role === 'assistant') {
              lastMsg.content = `错误: ${error.message}`;
            }
            return newMessages;
          });
        }
      );
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompress = async () => {
    if (!sessionId) return;
    try {
      const summary = await compressConversation(sessionId);
      if (summary) {
        alert('对话已压缩！摘要：' + summary.summary);
        loadSessionInfo();
      }
    } catch (error) {
      console.error('压缩失败:', error);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setSessionInfo(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
    <div className="context-chat-container">
      {/* 左侧面板 */}
      <div className="left-panel">
        <div className="panel-header">
          <h2>🤖 上下文感知客服</h2>
          <p>第12章演示 - 端口8012</p>
        </div>

        {/* 场景选择 */}
        <div className="panel-section">
          <h3>📋 场景选择</h3>
          <select 
            value={selectedScene} 
            onChange={(e) => setSelectedScene(e.target.value)}
            className="scene-select"
          >
            {scenes.map(scene => (
              <option key={scene.code} value={scene.code}>
                {scene.name}
              </option>
            ))}
          </select>
          <p className="scene-desc">
            {scenes.find(s => s.code === selectedScene)?.description}
          </p>
        </div>

        {/* 会话信息 */}
        <div className="panel-section">
          <h3>📊 会话状态</h3>
          {sessionInfo ? (
            <div className="session-info">
              <div className="info-item">
                <span>对话轮数:</span>
                <span className="value">{sessionInfo.turnCount}</span>
              </div>
              <div className="info-item">
                <span>压缩次数:</span>
                <span className="value">{sessionInfo.compressionCount}</span>
              </div>
              {sessionInfo.contextSummary && (
                <div className="context-summary">
                  <strong>上下文摘要:</strong>
                  <p>{sessionInfo.contextSummary}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="no-session">暂无会话</p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="panel-section">
          <h3>⚙️ 操作</h3>
          <div className="action-buttons">
            <button onClick={handleNewSession} className="btn btn-new">
              新建会话
            </button>
            <button 
              onClick={handleCompress} 
              className="btn btn-compress"
              disabled={!sessionId || (sessionInfo?.turnCount || 0) < 3}
            >
              压缩对话
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className="btn btn-settings"
            >
              {showSettings ? '隐藏设置' : '高级设置'}
            </button>
            <button 
              onClick={() => setShowTemplates(!showTemplates)} 
              className="btn btn-templates"
            >
              {showTemplates ? '隐藏模板' : '查看模板'}
            </button>
          </div>
        </div>

        {/* 高级设置 */}
        {showSettings && (
          <div className="panel-section settings-section">
            <h3>🔧 高级设置</h3>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={useCompression}
                onChange={(e) => setUseCompression(e.target.checked)}
              />
              启用上下文压缩
            </label>
            <div className="custom-prompt">
              <label>自定义系统提示词:</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="留空使用默认提示词..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* 模板列表 */}
        {showTemplates && (
          <div className="panel-section templates-section">
            <h3>📝 提示词模板</h3>
            <div className="templates-list">
              {templates.map(template => (
                <div key={template.id} className="template-item">
                  <strong>{template.name}</strong>
                  <p>{template.description}</p>
                  <span className="template-type">{template.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 右侧聊天区域 */}
      <div className="chat-panel">
        <div className="chat-header">
          <h3>
            {scenes.find(s => s.code === selectedScene)?.name || '通用客服'}
            {sessionId && <span className="session-badge">会话中</span>}
          </h3>
        </div>

        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>👋 欢迎使用上下文感知智能客服</h2>
              <p>这是第12章的演示系统，支持：</p>
              <ul>
                <li>📋 场景化提示词 - 根据不同场景优化回复</li>
                <li>🔄 多轮对话上下文 - 记住对话历史</li>
                <li>📦 上下文压缩 - 长对话自动摘要</li>
                <li>⚡ 流式输出 - 实时显示回复</li>
              </ul>
              <p>请选择场景并开始对话...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-bubble">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content || '...'}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
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
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息... (Enter发送，Shift+Enter换行)"
            disabled={isLoading}
            rows={2}
          />
          <button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextAwareChat;
