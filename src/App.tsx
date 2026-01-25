import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChatWindow } from './components/ChatWindow'
import ContextAwareChat from './components/ContextAwareChat'
import AuthPage from './components/AuthPage'
import KnowledgeChat from './components/KnowledgeChat'
import KnowledgeBase from './components/KnowledgeBase'
import MultiModalChat from './components/MultiModalChat'
import AgentManagement from './components/AgentManagement'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import AgentWorkspace from './components/AgentWorkspace'
import ProtectedRoute from './components/ProtectedRoute'
import { isLoggedIn, logout, getStoredUser } from './services/chapter14Service'
import './App.css'

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');

  // 检查登录状态
  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = isLoggedIn();
      console.log('检查登录状态:', loggedIn); // 调试日志
      setIsAuthenticated(loggedIn);
      if (loggedIn) {
        const user = getStoredUser();
        console.log('当前用户:', user); // 调试日志
        setUsername(user?.username || '');
      }
    };
    checkAuth();
    
    // 监听存储变化（跨标签页同步）
    window.addEventListener('storage', checkAuth);
    
    // 监听自定义存储事件（同标签页更新）
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setUsername('');
    navigate('/chapter_09');
  };

  // 判断当前是否在 chapter14 页面
  const isChapter14Page = location.pathname.startsWith('/chapter_14');
  // 判断当前是否在 chapter15 页面
  const isChapter15Page = location.pathname.startsWith('/chapter_15');

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
            className={`nav-tab ${location.pathname === '/chapter_09' ? 'active' : ''}`}
            onClick={() => navigate('/chapter_09')}
          >
            <span className="tab-icon">💬</span>
            第9章 - 多模型对话
            <span className="tab-port">:8009</span>
          </button>
          <button 
            className={`nav-tab ${location.pathname === '/chapter_12' ? 'active' : ''}`}
            onClick={() => navigate('/chapter_12')}
          >
            <span className="tab-icon">🧠</span>
            第12章 - 上下文感知
            <span className="tab-port">:8012</span>
          </button>
          <button 
            className={`nav-tab ${isChapter14Page ? 'active' : ''}`}
            onClick={() => navigate('/chapter_14')}
          >
            <span className="tab-icon">📚</span>
            第14章 - 知识库RAG
            <span className="tab-port">:8014</span>
          </button>
          <button 
            className={`nav-tab ${isChapter15Page ? 'active' : ''}`}
            onClick={() => navigate('/chapter_15')}
          >
            <span className="tab-icon">🎯</span>
            第15章 - 多模态客服
            <span className="tab-port">:8015</span>
          </button>
        </div>
        {/* 用户信息区域 */}
        {isAuthenticated && isChapter14Page && (
          <div className="nav-user">
            <span className="user-name">👤 {username}</span>
            <button className="btn-logout" onClick={handleLogout}>
              退出
            </button>
          </div>
        )}
      </nav>

      {/* 页面内容 */}
      <main className="app-main">
        <Routes>
          {/* 默认重定向到 chapter_09 */}
          <Route path="/" element={<Navigate to="/chapter_09" replace />} />
          
          {/* 第9章 - 多模型对话 */}
          <Route path="/chapter_09" element={<ChatWindow />} />
          
          {/* 第12章 - 上下文感知 */}
          <Route path="/chapter_12" element={<ContextAwareChat />} />
          
          {/* 登录页面 */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* 第14章 - 知识库RAG（需要登录） */}
          <Route 
            path="/chapter_14" 
            element={
              <ProtectedRoute>
                <KnowledgeChat onManageClick={() => navigate('/chapter_14/kb')} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chapter_14/kb" 
            element={
              <ProtectedRoute>
                <KnowledgeBase onBackToChat={() => navigate('/chapter_14')} />
              </ProtectedRoute>
            } 
          />
          
          {/* 第15章 - 多模态智能客服平台 */}
          <Route 
            path="/chapter_15" 
            element={
              <MultiModalChat 
                onNavigate={(page) => navigate(`/chapter_15/${page}`)} 
              />
            } 
          />
          <Route 
            path="/chapter_15/analytics" 
            element={
              <AnalyticsDashboard 
                onNavigate={(page) => navigate(page === 'chat' ? '/chapter_15' : `/chapter_15/${page}`)} 
              />
            } 
          />
          <Route 
            path="/chapter_15/agents" 
            element={
              <AgentManagement 
                onNavigate={(page) => navigate(page === 'chat' ? '/chapter_15' : `/chapter_15/${page}`)} 
              />
            } 
          />
          <Route 
            path="/chapter_15/workspace" 
            element={
              <AgentWorkspace 
                onNavigate={(page) => navigate(page === 'chat' ? '/chapter_15' : `/chapter_15/${page}`)} 
              />
            } 
          />
          
          {/* 404 页面 */}
          <Route path="*" element={<Navigate to="/chapter_09" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
