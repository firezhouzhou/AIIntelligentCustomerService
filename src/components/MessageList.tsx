/**
 * 消息列表组件 - 支持Markdown渲染
 */

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types/chat';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <div className="welcome-message">
          <div className="welcome-icon">👋</div>
          <h2>欢迎使用AI智能客服</h2>
          <p>有什么可以帮助您的吗？</p>
          <div className="quick-questions">
            <span className="quick-title">快捷问题：</span>
            <div className="quick-items">
              <button className="quick-item">产品使用咨询</button>
              <button className="quick-item">订单问题</button>
              <button className="quick-item">技术支持</button>
              <button className="quick-item">投诉建议</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      
      {isLoading && messages[messages.length - 1]?.role === 'assistant' && 
       messages[messages.length - 1]?.content === '' && (
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  
  const handleCopy = async () => {
    if (!message.content) return;
    
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    if (disliked) setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
  };

  const handleShare = () => {
    if (!message.content) return;
    // 这里可以实现分享功能
    console.log('分享消息:', message.content);
    alert('分享功能待实现');
  };

  const handleRetry = () => {
    // 这里可以实现重试功能
    console.log('重试消息');
    alert('重试功能待实现');
  };
  
  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          {isUser ? (
            // 用户消息直接显示文本
            message.content || ''
          ) : (
            // AI消息使用Markdown渲染
            <>
              {message.content ? (
                <MarkdownContent content={message.content} />
              ) : (
                message.status === 'sending' ? '' : '...'
              )}
            </>
          )}
          {message.status === 'sending' && <span className="cursor-blink">|</span>}
        </div>
        
        {/* 客服消息的操作按钮栏 */}
        {!isUser && message.content && (
          <div className="message-actions">
            <button 
              className={`action-btn ${copied ? 'active' : ''}`}
              onClick={handleCopy}
              title="复制"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button 
              className={`action-btn ${liked ? 'active liked' : ''}`}
              onClick={handleLike}
              title="点赞"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
            </button>
            <button 
              className={`action-btn ${disliked ? 'active disliked' : ''}`}
              onClick={handleDislike}
              title="点踩"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
              </svg>
            </button>
            <button 
              className="action-btn"
              onClick={handleShare}
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
          {formatTime(message.timestamp)}
          {message.status === 'error' && <span className="error-tag">发送失败</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Markdown内容渲染组件
 */
interface MarkdownContentProps {
  content: string;
}

function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      className="markdown-body"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // 代码块渲染
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;
          
          return isInline ? (
            <code className="inline-code" {...props}>
              {children}
            </code>
          ) : (
            <SyntaxHighlighter
              style={oneDark}
              language={match ? match[1] : 'text'}
              PreTag="div"
              className="code-block"
              showLineNumbers={true}
              wrapLines={true}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          );
        },
        // 链接在新窗口打开
        a({ href, children, ...props }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          );
        },
        // 表格样式
        table({ children, ...props }) {
          return (
            <div className="table-wrapper">
              <table {...props}>{children}</table>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
