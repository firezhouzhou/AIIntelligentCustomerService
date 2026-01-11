/**
 * 聊天窗口头部组件
 */

import './Header.css';

interface HeaderProps {
  onClear: () => void;
  messageCount: number;
}

export function Header({ onClear, messageCount }: HeaderProps) {
  return (
    <header className="chat-header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-icon">🤖</span>
          <div className="logo-text">
            <h1>AI智能客服</h1>
            <span className="status-badge">
              <span className="status-dot"></span>
              在线
            </span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        {messageCount > 0 && (
          <button className="clear-btn" onClick={onClear} title="清空对话">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            清空
          </button>
        )}
      </div>
    </header>
  );
}
