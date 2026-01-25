import { useState, useEffect } from 'react';
import {
  getSessionStats,
  getAgentPerformance,
  getHotQuestions,
  getRealtimeMonitor,
  SessionStats,
  AgentPerformance,
  HotQuestion,
  RealtimeMonitor,
} from '../services/chapter15Service';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  onNavigate: (page: 'chat' | 'agents') => void;
}

export default function AnalyticsDashboard({ onNavigate }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [performance, setPerformance] = useState<AgentPerformance[]>([]);
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>([]);
  const [monitor, setMonitor] = useState<RealtimeMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 日期范围
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    loadData();
    // 每30秒刷新实时监控数据
    const interval = setInterval(loadRealtimeData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadStatisticsData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStatisticsData(), loadRealtimeData()]);
    setLoading(false);
  };

  const loadStatisticsData = async () => {
    try {
      const [statsRes, perfRes, questionsRes] = await Promise.all([
        getSessionStats(startDate, endDate),
        getAgentPerformance(startDate, endDate),
        getHotQuestions(startDate, endDate, 10),
      ]);

      if (statsRes.code === 200) setStats(statsRes.data);
      if (perfRes.code === 200) setPerformance(perfRes.data);
      if (questionsRes.code === 200) setHotQuestions(questionsRes.data);
    } catch (err) {
      setError('加载统计数据失败');
    }
  };

  const loadRealtimeData = async () => {
    try {
      const res = await getRealtimeMonitor();
      if (res.code === 200) setMonitor(res.data);
    } catch (err) {
      console.error('加载实时数据失败:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    return `${(seconds / 3600).toFixed(1)}小时`;
  };

  return (
    <div className="analytics-dashboard-container">
      {/* 侧边栏 */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h3>功能导航</h3>
        </div>

        <div className="nav-menu">
          <div className="nav-item" onClick={() => onNavigate('chat')}>
            <span className="nav-icon">💬</span>
            <span>智能对话</span>
          </div>
          <div className="nav-item active">
            <span className="nav-icon">📊</span>
            <span>数据分析</span>
          </div>
          <div className="nav-item" onClick={() => onNavigate('agents')}>
            <span className="nav-icon">👥</span>
            <span>客服管理</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h4>日期范围</h4>
          <div className="date-picker">
            <label>开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-picker">
            <label>结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-section">
          <h4>实时监控</h4>
          {monitor && (
            <div className="realtime-stats">
              <div className="realtime-item">
                <span className="realtime-icon online">●</span>
                <span className="realtime-label">在线客服</span>
                <span className="realtime-value">{monitor.onlineAgents}</span>
              </div>
              <div className="realtime-item">
                <span className="realtime-icon active">●</span>
                <span className="realtime-label">活跃会话</span>
                <span className="realtime-value">{monitor.activeSessions}</span>
              </div>
              <div className="realtime-item">
                <span className="realtime-icon waiting">●</span>
                <span className="realtime-label">等待队列</span>
                <span className="realtime-value">{monitor.waitingQueue}</span>
              </div>
              <div className="realtime-item">
                <span className="realtime-icon">⏱️</span>
                <span className="realtime-label">平均等待</span>
                <span className="realtime-value">{monitor.avgWaitTime}秒</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="dashboard-main">
        {/* 头部 */}
        <div className="dashboard-header">
          <div className="header-info">
            <h2>
              <span className="header-icon">📊</span>
              数据分析
            </h2>
            <span className="header-desc">会话统计、客服绩效、热门问题分析</span>
          </div>
          <button className="btn-refresh" onClick={loadData}>
            🔄 刷新数据
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* 数据面板 */}
        <div className="dashboard-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>加载数据中...</p>
            </div>
          ) : (
            <>
              {/* 会话统计卡片 */}
              <section className="stats-section">
                <h3>会话统计</h3>
                <div className="stats-cards">
                  <div className="stat-card">
                    <div className="card-icon blue">💬</div>
                    <div className="card-content">
                      <span className="card-value">{stats?.totalSessions || 0}</span>
                      <span className="card-label">总会话数</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="card-icon green">🤖</div>
                    <div className="card-content">
                      <span className="card-value">{stats?.botSessions || 0}</span>
                      <span className="card-label">机器人处理</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="card-icon purple">👨‍💼</div>
                    <div className="card-content">
                      <span className="card-value">{stats?.agentSessions || 0}</span>
                      <span className="card-label">人工处理</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="card-icon orange">🔄</div>
                    <div className="card-content">
                      <span className="card-value">
                        {stats?.transferRate?.toFixed(1) || 0}%
                      </span>
                      <span className="card-label">转接率</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="card-icon yellow">⭐</div>
                    <div className="card-content">
                      <span className="card-value">
                        {stats?.avgSatisfaction?.toFixed(1) || '-'}
                      </span>
                      <span className="card-label">平均满意度</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="card-icon cyan">⏱️</div>
                    <div className="card-content">
                      <span className="card-value">
                        {stats?.avgSessionDuration
                          ? formatDuration(stats.avgSessionDuration)
                          : '-'}
                      </span>
                      <span className="card-label">平均时长</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 客服绩效表格 */}
              <section className="performance-section">
                <h3>客服绩效排行</h3>
                {performance.length > 0 ? (
                  <div className="performance-table">
                    <table>
                      <thead>
                        <tr>
                          <th>排名</th>
                          <th>客服姓名</th>
                          <th>处理会话</th>
                          <th>平均响应</th>
                          <th>满意度</th>
                          <th>工作时长</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performance.map((agent, index) => (
                          <tr key={agent.agentId}>
                            <td>
                              <span className={`rank rank-${index + 1}`}>
                                {index + 1}
                              </span>
                            </td>
                            <td>{agent.agentName}</td>
                            <td>{agent.totalSessions}</td>
                            <td>{agent.avgResponseTime}秒</td>
                            <td>
                              <span className="satisfaction-badge">
                                ⭐ {agent.avgSatisfaction.toFixed(1)}
                              </span>
                            </td>
                            <td>{agent.totalWorkingHours.toFixed(1)}小时</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-data">
                    <span>暂无绩效数据</span>
                  </div>
                )}
              </section>

              {/* 热门问题 */}
              <section className="questions-section">
                <h3>热门问题 TOP 10</h3>
                {hotQuestions.length > 0 ? (
                  <div className="questions-list">
                    {hotQuestions.map((q, index) => (
                      <div key={index} className="question-item">
                        <span className="question-rank">{index + 1}</span>
                        <div className="question-content">
                          <span className="question-text">{q.question}</span>
                          <div className="question-bar">
                            <div
                              className="bar-fill"
                              style={{ width: `${q.percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="question-stats">
                          <span className="count">{q.count}次</span>
                          <span className="percentage">{q.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-data">
                    <span>暂无热门问题数据</span>
                  </div>
                )}
              </section>

              {/* 系统负载 */}
              {monitor && (
                <section className="system-section">
                  <h3>系统状态</h3>
                  <div className="system-stats">
                    <div className="system-item">
                      <span className="system-label">消息处理速度</span>
                      <span className="system-value">
                        {monitor.messagesPerMinute} 条/分钟
                      </span>
                    </div>
                    <div className="system-item">
                      <span className="system-label">系统负载</span>
                      <div className="load-bar">
                        <div
                          className={`load-fill ${
                            monitor.systemLoad > 0.8
                              ? 'high'
                              : monitor.systemLoad > 0.5
                              ? 'medium'
                              : 'low'
                          }`}
                          style={{ width: `${monitor.systemLoad * 100}%` }}
                        />
                      </div>
                      <span className="load-value">
                        {(monitor.systemLoad * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="dashboard-footer">
          <span>数据分析 · 端口：8015</span>
          <span>数据更新时间：{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
