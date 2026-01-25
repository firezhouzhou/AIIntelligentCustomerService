import { useState, useEffect } from 'react';
import {
  getAllAgents,
  getOnlineAgents,
  createAgent,
  updateAgentStatus,
  deleteAgent,
  CustomerServiceAgent,
  AgentStatus,
} from '../services/chapter15Service';
import './AgentManagement.css';

interface AgentManagementProps {
  onNavigate: (page: 'chat' | 'analytics' | 'workspace') => void;
}

export default function AgentManagement({ onNavigate }: AgentManagementProps) {
  const [agents, setAgents] = useState<CustomerServiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomerServiceAgent | null>(null);
  const [filter, setFilter] = useState<'all' | 'online'>('all');

  // 表单状态
  const [formData, setFormData] = useState({
    agentCode: '',
    agentName: '',
    maxSessions: 5,
    skills: '',
  });

  useEffect(() => {
    loadAgents();
  }, [filter]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = filter === 'online' ? await getOnlineAgents() : await getAllAgents();
      if (result.code === 200 && result.data) {
        setAgents(result.data);
      } else {
        setError(result.message || '加载客服列表失败');
      }
    } catch (err) {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.agentCode || !formData.agentName) {
      setError('请填写客服工号和姓名');
      return;
    }

    try {
      const result = await createAgent({
        agentCode: formData.agentCode,
        agentName: formData.agentName,
        maxSessions: formData.maxSessions,
        skills: formData.skills,
      });

      if (result.code === 200) {
        setShowModal(false);
        resetForm();
        loadAgents();
      } else {
        setError(result.message || '创建失败');
      }
    } catch (err) {
      setError('创建请求失败');
    }
  };

  const handleStatusChange = async (id: number, status: AgentStatus) => {
    try {
      const result = await updateAgentStatus(id, status);
      if (result.code === 200) {
        loadAgents();
      } else {
        setError(result.message || '更新状态失败');
      }
    } catch (err) {
      setError('更新请求失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该客服吗？')) return;

    try {
      const result = await deleteAgent(id);
      if (result.code === 200) {
        loadAgents();
      } else {
        setError(result.message || '删除失败');
      }
    } catch (err) {
      setError('删除请求失败');
    }
  };

  const resetForm = () => {
    setFormData({
      agentCode: '',
      agentName: '',
      maxSessions: 5,
      skills: '',
    });
    setEditingAgent(null);
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'online':
        return 'status-online';
      case 'offline':
        return 'status-offline';
      case 'busy':
        return 'status-busy';
      case 'away':
        return 'status-away';
      default:
        return '';
    }
  };

  const getStatusText = (status: AgentStatus) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'offline':
        return '离线';
      case 'busy':
        return '忙碌';
      case 'away':
        return '离开';
      default:
        return status;
    }
  };

  return (
    <div className="agent-management-container">
      {/* 侧边栏 */}
      <div className="management-sidebar">
        <div className="sidebar-header">
          <h3>功能导航</h3>
        </div>

        <div className="nav-menu">
          <div className="nav-item" onClick={() => onNavigate('chat')}>
            <span className="nav-icon">💬</span>
            <span>智能对话</span>
          </div>
          <div className="nav-item" onClick={() => onNavigate('workspace')}>
            <span className="nav-icon">🎧</span>
            <span>客服工作台</span>
          </div>
          <div className="nav-item" onClick={() => onNavigate('analytics')}>
            <span className="nav-icon">📊</span>
            <span>数据分析</span>
          </div>
          <div className="nav-item active">
            <span className="nav-icon">👥</span>
            <span>客服管理</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h4>快速统计</h4>
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-value">{agents.length}</span>
              <span className="stat-label">总客服数</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {agents.filter((a) => a.status === 'online').length}
              </span>
              <span className="stat-label">在线客服</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {agents.reduce((sum, a) => sum + a.currentSessions, 0)}
              </span>
              <span className="stat-label">活跃会话</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="management-main">
        {/* 头部 */}
        <div className="management-header">
          <div className="header-info">
            <h2>
              <span className="header-icon">👥</span>
              客服管理
            </h2>
            <span className="header-desc">管理客服账号、状态和权限</span>
          </div>
          <div className="header-actions">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                全部客服
              </button>
              <button
                className={`filter-tab ${filter === 'online' ? 'active' : ''}`}
                onClick={() => setFilter('online')}
              >
                在线客服
              </button>
            </div>
            <button className="btn-add" onClick={() => setShowModal(true)}>
              <span>+</span> 添加客服
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* 客服列表 */}
        <div className="agents-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <h3>暂无客服数据</h3>
              <p>点击"添加客服"按钮创建第一个客服账号</p>
              <button className="btn-create" onClick={() => setShowModal(true)}>
                添加客服
              </button>
            </div>
          ) : (
            <div className="agents-grid">
              {agents.map((agent) => (
                <div key={agent.id} className="agent-card">
                  <div className="card-header">
                    <div className="agent-avatar">
                      {agent.agentName.charAt(0)}
                    </div>
                    <div className="agent-info">
                      <h4>{agent.agentName}</h4>
                      <span className="agent-code">{agent.agentCode}</span>
                    </div>
                    <div className={`status-badge ${getStatusColor(agent.status)}`}>
                      <span className="status-dot"></span>
                      {getStatusText(agent.status)}
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="agent-stats">
                      <div className="stat-item">
                        <span className="stat-label">当前会话</span>
                        <span className="stat-value">
                          {agent.currentSessions}/{agent.maxSessions}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">总会话数</span>
                        <span className="stat-value">{agent.totalSessions}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">满意度</span>
                        <span className="stat-value">
                          {agent.avgSatisfaction > 0
                            ? agent.avgSatisfaction.toFixed(1)
                            : '-'}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">响应时间</span>
                        <span className="stat-value">
                          {agent.avgResponseTime > 0
                            ? `${agent.avgResponseTime}s`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    {agent.skills && (
                      <div className="agent-skills">
                        {agent.skills.split(',').map((skill, idx) => (
                          <span key={idx} className="skill-tag">
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-footer">
                    <select
                      value={agent.status}
                      onChange={(e) =>
                        handleStatusChange(agent.id, e.target.value as AgentStatus)
                      }
                      className="status-select"
                    >
                      <option value="online">在线</option>
                      <option value="offline">离线</option>
                      <option value="busy">忙碌</option>
                      <option value="away">离开</option>
                    </select>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(agent.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="management-footer">
          <span>客服管理 · 端口：8015</span>
          <button className="btn-refresh" onClick={loadAgents}>
            🔄 刷新列表
          </button>
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="agent-modal">
            <h3>{editingAgent ? '编辑客服' : '添加客服'}</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <div className="form-group">
                <label>客服工号 *</label>
                <input
                  type="text"
                  value={formData.agentCode}
                  onChange={(e) =>
                    setFormData({ ...formData, agentCode: e.target.value })
                  }
                  placeholder="如：A001"
                  required
                />
              </div>
              <div className="form-group">
                <label>客服姓名 *</label>
                <input
                  type="text"
                  value={formData.agentName}
                  onChange={(e) =>
                    setFormData({ ...formData, agentName: e.target.value })
                  }
                  placeholder="如：张客服"
                  required
                />
              </div>
              <div className="form-group">
                <label>最大并发会话</label>
                <input
                  type="number"
                  value={formData.maxSessions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxSessions: parseInt(e.target.value) || 5,
                    })
                  }
                  min={1}
                  max={20}
                />
              </div>
              <div className="form-group">
                <label>技能标签</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) =>
                    setFormData({ ...formData, skills: e.target.value })
                  }
                  placeholder="如：售后,退款,投诉处理（逗号分隔）"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  取消
                </button>
                <button type="submit" className="btn-confirm">
                  {editingAgent ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
