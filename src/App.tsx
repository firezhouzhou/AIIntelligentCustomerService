import { useState } from 'react'
import { ChatWindow } from './components/ChatWindow'
import ContextAwareChat from './components/ContextAwareChat'
import './App.css'

type PageType = 'chapter9' | 'chapter12';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('chapter9');

  return (
    <div className="app">
      {/* 导航栏 */}
      <nav className="app-nav">
        <div className="nav-brand">
          <span className="nav-logo">🤖</span>
          <span className="nav-title">AI智能客服系统</span>
        </div>
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${currentPage === 'chapter9' ? 'active' : ''}`}
            onClick={() => setCurrentPage('chapter9')}
          >
            <span className="tab-icon">💬</span>
            第9章 - 多模型对话
            <span className="tab-port">:8009</span>
          </button>
          <button 
            className={`nav-tab ${currentPage === 'chapter12' ? 'active' : ''}`}
            onClick={() => setCurrentPage('chapter12')}
          >
            <span className="tab-icon">🧠</span>
            第12章 - 上下文感知
            <span className="tab-port">:8012</span>
          </button>
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="app-main">
        {currentPage === 'chapter9' && <ChatWindow />}
        {currentPage === 'chapter12' && <ContextAwareChat />}
      </main>
    </div>
  )
}

export default App
