import { useState, useEffect, useRef } from 'react';
import {
  getKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentStatus,
  KnowledgeBase as KnowledgeBaseType,
  Document,
} from '../services/chapter14Service';
import './KnowledgeBase.css';

interface KnowledgeBaseProps {
  onBackToChat: () => void;
}

export default function KnowledgeBase({ onBackToChat }: KnowledgeBaseProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseType[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseType | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  // 加载文档列表
  useEffect(() => {
    if (selectedKb) {
      loadDocuments(selectedKb.id);
    } else {
      setDocuments([]);
    }
  }, [selectedKb]);

  // 定时刷新处理中的文档状态
  useEffect(() => {
    const processingDocs = documents.filter(
      (d) => d.status === 'pending' || d.status === 'processing'
    );
    
    if (processingDocs.length > 0) {
      const interval = setInterval(() => {
        processingDocs.forEach(async (doc) => {
          try {
            const result = await getDocumentStatus(doc.id);
            if (result.success && result.data) {
              setDocuments((prev) =>
                prev.map((d) => (d.id === doc.id ? result.data! : d))
              );
            }
          } catch (err) {
            console.error('刷新文档状态失败:', err);
          }
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [documents]);

  const loadKnowledgeBases = async () => {
    setLoading(true);
    try {
      const result = await getKnowledgeBases();
      if (result.success && result.data) {
        setKnowledgeBases(result.data);
        if (result.data.length > 0 && !selectedKb) {
          setSelectedKb(result.data[0]);
        }
      }
    } catch (err) {
      setError('加载知识库失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (kbId: number) => {
    try {
      const result = await getDocuments(kbId);
      if (result.success && result.data) {
        setDocuments(result.data);
      }
    } catch (err) {
      console.error('加载文档失败:', err);
    }
  };

  const handleCreateKb = async () => {
    if (!newKbName.trim()) {
      setError('请输入知识库名称');
      return;
    }

    try {
      const result = await createKnowledgeBase(newKbName, newKbDesc);
      if (result.success && result.data) {
        setKnowledgeBases((prev) => [...prev, result.data!]);
        setSelectedKb(result.data);
        setShowCreateModal(false);
        setNewKbName('');
        setNewKbDesc('');
        setSuccess('知识库创建成功');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || '创建失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleDeleteKb = async (kb: KnowledgeBaseType) => {
    if (!confirm(`确定要删除知识库 "${kb.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const result = await deleteKnowledgeBase(kb.id);
      if (result.success) {
        setKnowledgeBases((prev) => prev.filter((k) => k.id !== kb.id));
        if (selectedKb?.id === kb.id) {
          setSelectedKb(knowledgeBases.find((k) => k.id !== kb.id) || null);
        }
        setSuccess('知识库已删除');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || '删除失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedKb) return;

    setUploading(true);
    setError('');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await uploadDocument(selectedKb.id, file);
        if (result.success && result.data) {
          setDocuments((prev) => [...prev, result.data!]);
          setSuccess(`文件 "${file.name}" 上传成功`);
        } else {
          setError(`上传 "${file.name}" 失败: ${result.message}`);
        }
      } catch (err) {
        setError(`上传 "${file.name}" 失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    }

    setUploading(false);
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // 刷新知识库信息
    loadKnowledgeBases();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`确定要删除文档 "${doc.fileName}" 吗？`)) {
      return;
    }

    try {
      const result = await deleteDocument(doc.id);
      if (result.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        setSuccess('文档已删除');
        loadKnowledgeBases(); // 刷新知识库统计
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || '删除失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      pending: { label: '等待处理', class: 'status-pending' },
      processing: { label: '处理中', class: 'status-processing' },
      completed: { label: '已完成', class: 'status-completed' },
      failed: { label: '失败', class: 'status-failed' },
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`status-badge ${s.class}`}>{s.label}</span>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    const iconMap: Record<string, string> = {
      pdf: '📕',
      docx: '📘',
      doc: '📘',
      txt: '📄',
      md: '📝',
    };
    return iconMap[fileType] || '📄';
  };

  return (
    <div className="kb-manager-container">
      {/* 顶部工具栏 */}
      <div className="kb-toolbar">
        <button className="btn-back" onClick={onBackToChat}>
          ← 返回聊天
        </button>
        <h2>知识库管理</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + 新建知识库
        </button>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="message-bar error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="message-bar success">
          <span>✅ {success}</span>
        </div>
      )}

      <div className="kb-content">
        {/* 左侧知识库列表 */}
        <div className="kb-list-panel">
          <div className="panel-title">
            <span>全部知识库</span>
            <span className="count">{knowledgeBases.length}</span>
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner"></span>
              <span>加载中...</span>
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📚</span>
              <p>暂无知识库</p>
              <p className="hint">点击右上角创建新知识库</p>
            </div>
          ) : (
            <div className="kb-items">
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  className={`kb-list-item ${selectedKb?.id === kb.id ? 'active' : ''}`}
                  onClick={() => setSelectedKb(kb)}
                >
                  <div className="item-icon">📚</div>
                  <div className="item-content">
                    <div className="item-name">{kb.name}</div>
                    <div className="item-meta">
                      {kb.documentCount} 文档 | {kb.vectorCount} 向量
                    </div>
                  </div>
                  <button
                    className="btn-delete-kb"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteKb(kb);
                    }}
                    title="删除知识库"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧文档管理 */}
        <div className="doc-panel">
          {!selectedKb ? (
            <div className="no-kb-selected">
              <span className="icon">👈</span>
              <h3>请选择一个知识库</h3>
              <p>选择知识库后可管理其中的文档</p>
            </div>
          ) : (
            <>
              {/* 知识库信息 */}
              <div className="kb-info-header">
                <div className="kb-detail">
                  <h3>{selectedKb.name}</h3>
                  <p className="kb-desc">{selectedKb.description || '暂无描述'}</p>
                  <div className="kb-stats">
                    <span className="stat-item">
                      <strong>{selectedKb.documentCount}</strong> 文档
                    </span>
                    <span className="stat-item">
                      <strong>{selectedKb.vectorCount}</strong> 向量块
                    </span>
                  </div>
                </div>
                <div className="kb-actions">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.docx,.doc,.txt,.md"
                    multiple
                    style={{ display: 'none' }}
                  />
                  <button
                    className="btn-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-small"></span>
                        上传中...
                      </>
                    ) : (
                      <>📤 上传文档</>
                    )}
                  </button>
                </div>
              </div>

              {/* 文档列表 */}
              <div className="doc-list-container">
                <div className="doc-list-header">
                  <span>文档列表</span>
                  <span className="supported-types">
                    支持格式：PDF、Word、TXT、Markdown
                  </span>
                </div>

                {documents.length === 0 ? (
                  <div className="empty-docs">
                    <span className="icon">📄</span>
                    <h4>暂无文档</h4>
                    <p>上传文档后，系统会自动进行向量化处理</p>
                    <button
                      className="btn-upload-empty"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      上传第一个文档
                    </button>
                  </div>
                ) : (
                  <div className="doc-list">
                    {documents.map((doc) => (
                      <div key={doc.id} className="doc-item">
                        <div className="doc-icon">{getFileIcon(doc.fileType)}</div>
                        <div className="doc-info">
                          <div className="doc-name">{doc.fileName}</div>
                          <div className="doc-meta">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>{doc.chunkCount} 分块</span>
                            {doc.createdAt && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(doc.createdAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          {doc.errorMessage && (
                            <div className="doc-error">
                              错误：{doc.errorMessage}
                            </div>
                          )}
                        </div>
                        <div className="doc-status">
                          {getStatusBadge(doc.status)}
                        </div>
                        <button
                          className="btn-delete-doc"
                          onClick={() => handleDeleteDoc(doc)}
                          title="删除文档"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 上传说明 */}
              <div className="upload-tips">
                <h4>📋 上传说明</h4>
                <ul>
                  <li>支持 PDF、Word（.docx）、纯文本（.txt）、Markdown（.md）格式</li>
                  <li>单个文件大小不超过 10MB</li>
                  <li>上传后系统会自动进行文本提取和向量化处理</li>
                  <li>处理完成后即可在聊天中使用该知识库进行问答</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 创建知识库弹窗 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>创建知识库</h3>
              <button
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>知识库名称 *</label>
                <input
                  type="text"
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder="输入知识库名称"
                />
              </div>
              <div className="form-group">
                <label>描述（可选）</label>
                <textarea
                  value={newKbDesc}
                  onChange={(e) => setNewKbDesc(e.target.value)}
                  placeholder="输入知识库描述"
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </button>
              <button className="btn-confirm" onClick={handleCreateKb}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
