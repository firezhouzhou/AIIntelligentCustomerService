/**
 * 消息列表组件 - 支持Markdown渲染
 */

import { useEffect, useRef } from 'react';
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
