import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, register } from '../services/chapter14Service';
import './AuthPage.css';

type PageMode = 'login' | 'register';
type AuthMode = 'password' | 'code';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pageMode, setPageMode] = useState<PageMode>('login');
  const [mode, setMode] = useState<AuthMode>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // 获取登录前的页面路径
  const from = (location.state as any)?.from || '/chapter_14';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // 验证
    if (!username.trim()) {
      setError('请填写账号');
      return;
    }

    if (pageMode === 'register') {
      if (!email.trim()) {
        setError('请填写邮箱');
        return;
      }
      if (!password.trim() || !confirmPassword.trim()) {
        setError('请填写密码');
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
      if (!agreeToTerms) {
        setError('请同意用户协议和隐私政策');
        return;
      }
    } else {
      if (!password.trim()) {
        setError('请填写密码');
        return;
      }
      if (password.length < 6) {
        setError('密码长度至少为6位');
        return;
      }
    }

    setLoading(true);

    try {
      if (pageMode === 'login') {
        const result = await login(username, password);
        console.log('🎯 登录最终结果:', result);
        
        if (result.success) {
          console.log('✅ 登录成功！准备跳转...');
          
          // 触发存储事件，通知其他组件更新状态
          window.dispatchEvent(new Event('storage'));
          
          // 跳转
          setTimeout(() => {
            navigate(from, { replace: true });
            
            // 备用跳转
            setTimeout(() => {
              if (window.location.pathname === '/auth') {
                window.location.href = from;
              }
            }, 200);
          }, 100);
        } else {
          setError(result.message || '登录失败');
        }
      } else {
        const result = await register(username, password, email);
        console.log('📝 注册结果:', result);
        
        if (result.success) {
          setSuccessMessage('注册成功！请登录');
          setTimeout(() => {
            setPageMode('login');
            setPassword('');
            setConfirmPassword('');
            setError('');
            setSuccessMessage('');
          }, 1500);
        } else {
          setError(result.message || '注册失败');
        }
      }
    } catch (err) {
      console.error('💥 操作错误:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* 左侧插画区域 */}
        <div className="auth-illustration">
          <div className="illustration-content">
            <div className="laptop-illustration">
              {/* 3D笔记本电脑插画 */}
              <div className="laptop-screen">
                <div className="screen-content">
                  <div className="chart-icon">📊</div>
                  <div className="data-lines">
                    <div className="data-line"></div>
                    <div className="data-line"></div>
                    <div className="data-line"></div>
                  </div>
                  <div className="wave-chart"></div>
                </div>
              </div>
              <div className="laptop-base"></div>
              <div className="laptop-keyboard"></div>
            </div>
          </div>
        </div>

        {/* 右侧表单区域 */}
        <div className="auth-form-section">
          <div className="auth-card">
            {/* Logo */}
            <div className="auth-logo">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#2563eb"/>
                  <path d="M10 12L16 8L22 12V20L16 24L10 20V12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 16L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 16V24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 16L10 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* 标题 */}
            <h1 className="auth-title">{pageMode === 'login' ? '欢迎登录' : '欢迎注册'}</h1>

            {/* Tab切换（仅登录页显示） */}
            {pageMode === 'login' && (
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${mode === 'password' ? 'active' : ''}`}
                  onClick={() => setMode('password')}
                >
                  账号密码登录
                </button>
                <button
                  className={`auth-tab ${mode === 'code' ? 'active' : ''}`}
                  onClick={() => setMode('code')}
                >
                  验证码登录
                </button>
              </div>
            )}

            {/* 表单 */}
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-message error">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="auth-message success">
                  {successMessage}
                </div>
              )}

              {/* 手机号/账号输入 */}
              <div className="form-group">
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={pageMode === 'register' ? '请输入账号' : '请输入账号'}
                  autoComplete="username"
                  required
                />
              </div>

              {/* 邮箱输入（仅注册） */}
              {pageMode === 'register' && (
                <div className="form-group">
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱"
                    autoComplete="email"
                    required
                  />
                </div>
              )}

              {/* 密码输入（账号密码登录 或 注册） */}
              {(pageMode === 'register' || mode === 'password') && (
                <div className="form-group">
                  <div className="input-with-icon">
                    <input
                      type="password"
                      className="form-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      autoComplete={pageMode === 'register' ? 'new-password' : 'current-password'}
                      minLength={6}
                      required
                    />
                    <button type="button" className="input-icon-button">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* 确认密码（仅注册） */}
              {pageMode === 'register' && (
                <div className="form-group">
                  <div className="input-with-icon">
                    <input
                      type="password"
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <button type="button" className="input-icon-button">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* 验证码输入（验证码登录） */}
              {pageMode === 'login' && mode === 'code' && (
                <div className="form-group">
                  <div className="input-with-link">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="请输入验证码"
                      required
                    />
                    <button type="button" className="input-link">
                      获取验证码
                    </button>
                  </div>
                </div>
              )}

              {/* 用户协议（仅注册） */}
              {pageMode === 'register' && (
                <div className="form-group">
                  <label className="checkbox-label terms-label-wrapper">
                    <input
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                    />
                    <span className="checkbox-icon">
                      {agreeToTerms && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="checkbox-text">
                      我已阅读并同意 <a href="#" className="terms-link">《用户协议》</a> 和 <a href="#" className="terms-link">《隐私政策》</a>
                    </span>
                  </label>
                </div>
              )}

              {/* 记住我和忘记密码（仅登录-账号密码） */}
              {pageMode === 'login' && mode === 'password' && (
                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="checkbox-icon">
                      {rememberMe && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="checkbox-text">记住我</span>
                  </label>
                  <button type="button" className="forgot-link">
                    忘记密码?
                  </button>
                </div>
              )}

              {/* 记住我和收不到验证码（仅登录-验证码） */}
              {pageMode === 'login' && mode === 'code' && (
                <div className="form-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="checkbox-icon">
                      {rememberMe && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="checkbox-text">记住我</span>
                  </label>
                  <button type="button" className="forgot-link">
                    收不到验证码?
                  </button>
                </div>
              )}

              {/* 登录/注册按钮 */}
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    {pageMode === 'login' ? '登录中...' : '注册中...'}
                  </>
                ) : (
                  pageMode === 'login' ? '登 录' : '立即注册'
                )}
              </button>

              {/* 注册/登录提示 */}
              <div className="register-hint">
                {pageMode === 'login' ? (
                  <>
                    <span>没有账号? </span>
                    <button 
                      type="button" 
                      className="register-link"
                      onClick={() => {
                        setPageMode('register');
                        setError('');
                        setSuccessMessage('');
                        setPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      立即注册
                    </button>
                  </>
                ) : (
                  <>
                    <span>已有账号? </span>
                    <button 
                      type="button" 
                      className="register-link"
                      onClick={() => {
                        setPageMode('login');
                        setError('');
                        setSuccessMessage('');
                        setPassword('');
                        setConfirmPassword('');
                        setEmail('');
                        setAgreeToTerms(false);
                      }}
                    >
                      立即登录
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
