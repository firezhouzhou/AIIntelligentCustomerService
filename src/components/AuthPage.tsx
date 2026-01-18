import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, register } from '../services/chapter14Service';
import './AuthPage.css';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 获取登录前的页面路径
  const from = (location.state as any)?.from || '/chapter_14';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 验证
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }

    if (mode === 'register') {
      if (!email.trim()) {
        setError('请填写邮箱');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少为6位');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login(username, password);
        console.log('🎯 登录最终结果:', result);
        
        if (result.success) {
          console.log('✅ 登录成功！准备跳转...');
          console.log('📍 目标路径:', from);
          console.log('📍 当前路径:', window.location.pathname);
          
          // 触发存储事件，通知其他组件更新状态
          window.dispatchEvent(new Event('storage'));
          
          // 使用多种跳转方式确保成功
          setTimeout(() => {
            console.log('🚀 执行跳转到:', from);
            
            // 方式1: React Router 导航（推荐）
            navigate(from, { replace: true });
            
            // 方式2: 如果 navigate 失败，使用原生跳转（备用）
            setTimeout(() => {
              if (window.location.pathname === '/auth') {
                console.warn('⚠️ React Router 跳转可能失败，使用原生跳转');
                window.location.href = from;
              } else {
                console.log('✅ 跳转成功！当前页面:', window.location.pathname);
              }
            }, 200);
          }, 100);
        } else {
          console.error('❌ 登录失败:', result.message);
          setError(result.message || '登录失败');
        }
      } else {
        const result = await register(username, password, email);
        console.log('📝 注册结果:', result);
        
        if (result.success) {
          setSuccessMessage('注册成功，请登录');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        } else {
          setError(result.message || '注册失败');
        }
      }
    } catch (err) {
      console.error('💥 登录/注册错误:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo区域 */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">知识库RAG系统</span>
          </div>
          <p className="auth-subtitle">
            {mode === 'login' ? '欢迎回来，请登录您的账号' : '创建新账号，开始智能问答之旅'}
          </p>
        </div>

        {/* 模式切换Tab */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        {/* 表单 */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-message error">
              <span className="message-icon">⚠️</span>
              {error}
            </div>
          )}

          {successMessage && (
            <div className="auth-message success">
              <span className="message-icon">✅</span>
              {successMessage}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="email">邮箱</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">确认密码</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                {mode === 'login' ? '登录中...' : '注册中...'}
              </>
            ) : (
              mode === 'login' ? '登录' : '注册'
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              还没有账号？
              <button className="link-button" onClick={() => switchMode('register')}>
                立即注册
              </button>
            </p>
          ) : (
            <p>
              已有账号？
              <button className="link-button" onClick={() => switchMode('login')}>
                立即登录
              </button>
            </p>
          )}
        </div>

        {/* 功能特点 */}
        <div className="auth-features">
          <div className="feature-item">
            <span className="feature-icon">🤖</span>
            <span>AI智能问答</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📄</span>
            <span>文档知识库</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔍</span>
            <span>语义检索</span>
          </div>
        </div>
      </div>
    </div>
  );
}
